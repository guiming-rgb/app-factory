import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import {
  resolveEntityForScreen,
  entityTableName,
  primaryKeyField,
  type AppSpecEntityField
} from "@/lib/app-spec/entity-scaffold";

/**
 * Flutter Form 页面生成
 * 修复三大障碍之一：表单生成
 */

function esc(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
}

function pascalCase(id: string): string {
  return id
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** 字段类型 → Flutter 输入控件 */
function fieldWidget(field: AppSpecEntityField, fieldName: string): string {
  const t = field.type.toLowerCase();
  const controller = `_${field.name}Controller`;
  switch (t) {
    case "bool":
    case "boolean":
      return `              Row(
                children: [
                  Text("${esc(field.name)}", style: const TextStyle(fontWeight: FontWeight.w600)),
                  const Spacer(),
                  Switch(value: _${field.name}, onChanged: (v) => setState(() => _${field.name} = v)),
                ],
              ),
              const SizedBox(height: 12),`;

    case "int":
    case "integer":
    case "float":
    case "number":
      return `              TextFormField(
                controller: ${controller},
                decoration: const InputDecoration(labelText: "${esc(field.name)}", border: OutlineInputBorder(), isDense: true),
                keyboardType: TextInputType.number,
                validator: (v) => (v == null || v.isEmpty) ? "${esc(field.name)} 不能为空" : null,
              ),
              const SizedBox(height: 12),`;

    case "datetime":
    case "date":
    case "timestamp":
      return `              TextFormField(
                controller: ${controller},
                decoration: InputDecoration(
                  labelText: "${esc(field.name)}",
                  border: const OutlineInputBorder(), isDense: true,
                  suffixIcon: IconButton(icon: const Icon(Icons.calendar_today), onPressed: () async {
                    final date = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2020), lastDate: DateTime(2030));
                    if (date != null) ${controller}.text = date.toIso8601String().split("T")[0];
                  }),
                ),
                validator: (v) => (v == null || v.isEmpty) ? "请选择${esc(field.name)}" : null,
              ),
              const SizedBox(height: 12),`;

    case "image":
    case "file":
      return `              ListTile(
                leading: const Icon(Icons.upload_file),
                title: Text("${esc(field.name)}"),
                subtitle: _${field.name}Path != null ? Text(_${field.name}Path!) : const Text("未选择"),
                onTap: _pickFile,
              ),
              const SizedBox(height: 12),`;

    case "json":
      return `              TextFormField(
                controller: ${controller},
                decoration: const InputDecoration(labelText: "${esc(field.name)} (JSON)", border: OutlineInputBorder(), isDense: true),
                maxLines: 3,
              ),
              const SizedBox(height: 12),`;

    default: // string, text, uuid
      return `              TextFormField(
                controller: ${controller},
                decoration: const InputDecoration(labelText: "${esc(field.name)}", border: OutlineInputBorder(), isDense: true),
                validator: (v) => (v == null || v.isEmpty) ? "${esc(field.name)} 不能为空" : null,
              ),
              const SizedBox(height: 12),`;
  }
}

function getInitialValue(field: AppSpecEntityField): string {
  const t = field.type.toLowerCase();
  if (t === "bool" || t === "boolean") return "false";
  if (t === "int" || t === "integer" || t === "float" || t === "number") return "0";
  return "''";
}

function hasImageField(fields: AppSpecEntityField[]): boolean {
  return fields.some((f) =>
    f.type.toLowerCase() === "image" || f.type.toLowerCase() === "file"
  );
}

export function emitFlutterFormPage(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  const entity = resolveEntityForScreen(spec, screen);
  const fields = entity?.fields ?? [
    { name: "title", type: "string" },
    { name: "note", type: "string" }
  ];

  const formFields = fields.filter((f) => f.name !== "id" || !f.primary);
  const className = pascalCase(screen.id) + "FormPage";
  const title = esc(screen.title);
  const table = entity ? esc(entityTableName(entity)) : "items";

  const controllers = formFields
    .filter((f) => {
      const t = f.type.toLowerCase();
      return t !== "bool" && t !== "boolean" && t !== "image" && t !== "file";
    })
    .map((f) => `  final _${esc(f.name)}Controller = TextEditingController();`)
    .join("\n");

  const stateVars = formFields
    .filter((f) => {
      const t = f.type.toLowerCase();
      return t === "bool" || t === "boolean";
    })
    .map((f) => `  bool _${esc(f.name)} = false;`)
    .join("\n");

  const imageVars = formFields
    .filter((f) => f.type.toLowerCase() === "image" || f.type.toLowerCase() === "file")
    .map((f) => `  String? _${esc(f.name)}Path;`)
    .join("\n");

  const widgets = formFields
    .filter((f) => !f.primary || f.name !== "id")
    .map((f) => fieldWidget(f, f.name))
    .join("\n");

  const needImage = hasImageField(fields);

  const buildData = formFields
    .filter((f) => !f.primary || f.name !== "id")
    .map((f) => {
      const t = f.type.toLowerCase();
      if (t === "bool" || t === "boolean") return `      "${esc(f.name)}": _${esc(f.name)},`;
      if (t === "image" || t === "file") return `      "${esc(f.name)}": _${esc(f.name)}Path ?? "",`;
      return `      "${esc(f.name)}": _${esc(f.name)}Controller.text,`;
    })
    .join("\n");

  return `import "package:flutter/material.dart";
${needImage ? 'import "package:file_picker/file_picker.dart";' : ""}

import "../../../core/config/env.dart";
import "package:supabase_flutter/supabase_flutter.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
${controllers}
${stateVars}${imageVars ? "\n" + imageVars : ""}
  final _formKey = GlobalKey<FormState>();
  bool _submitting = false;

  @override
  void dispose() {
${formFields.filter(f => { const t = f.type.toLowerCase(); return t !== "bool" && t !== "boolean" && t !== "image" && t !== "file"; }).map(f => `    _${esc(f.name)}Controller.dispose();`).join("\n")}
    super.dispose();
  }
${needImage ? `
  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles();
      if (result != null && result.files.single.path != null) {
        setState(() => _${esc(fields.find(f => f.type.toLowerCase() === "image" || f.type.toLowerCase() === "file")?.name ?? "file")}Path = result.files.single.path);
      }
    } catch (_) {}
  }
` : ""}
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      final client = Supabase.instance.client;
      await client.from("${table}").insert({
${buildData}
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("提交成功"), backgroundColor: Colors.green),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("提交失败：\${e}"), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
${widgets}
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text("提交"),
            ),
          ],
        ),
      ),
    );
  }
}
`;
}

export function emitFlutterFormPlaceholder(
  screen: AppSpecScreen,
  spec: AppSpec
): string {
  // 有实体的用真实表单，无实体的用轻量版
  const entity = resolveEntityForScreen(spec, screen);
  if (entity) return emitFlutterFormPage(screen, spec);

  const className = pascalCase(screen.id) + "FormPage";
  const title = esc(screen.title);
  return `import "package:flutter/material.dart";

class ${className} extends StatefulWidget {
  const ${className}({super.key});

  @override
  State<${className}> createState() => _${className}State();
}

class _${className}State extends State<${className}> {
  final _controller = TextEditingController();
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    _noteController.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("请输入内容")),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("已保存（本地演示）"), backgroundColor: Colors.green),
    );
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("${title}")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextFormField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: "标题", border: OutlineInputBorder(), isDense: true),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _noteController,
            decoration: const InputDecoration(
              labelText: "备注", border: OutlineInputBorder(), isDense: true),
            maxLines: 3,
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _submit, child: const Text("提交")),
        ],
      ),
    );
  }
}
`;
}
