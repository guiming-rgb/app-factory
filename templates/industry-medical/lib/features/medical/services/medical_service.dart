import "package:supabase_flutter/supabase_flutter.dart";

class MedicalService {
  final SupabaseClient _c; MedicalService(this._c);
  Future<List<Map<String,dynamic>>> getDepartments() async => ((await _c.from("departments").select("*").order("name")) as List).cast<Map<String,dynamic>>();
  Future<List<Map<String,dynamic>>> getDoctors({String? deptId}) async {
    var q=_c.from("doctors").select("*").order("name");
    if(deptId!=null) q=q.eq("department_id",deptId);
    return ((await q) as List).cast<Map<String,dynamic>>();
  }
  Future<String> makeAppointment({required String doctorId,required DateTime time,String? notes}) async {
    final r=await _c.from("appointments").insert({'user_id':_c.auth.currentUser!.id,'doctor_id':doctorId,'appointment_time':time.toIso8601String(),'notes':notes,'status':'pending'}).select("id").single();
    return (r as Map)['id'] as String;
  }
  Future<List<Map<String,dynamic>>> getMyAppointments() async => ((await _c.from("appointments").select("*,doctors(name,title,department_id)" ).eq("user_id",_c.auth.currentUser!.id).order("appointment_time",ascending:true)) as List).cast<Map<String,dynamic>>();
  Future<List<Map<String,dynamic>>> getMedicalRecords() async => ((await _c.from("medical_records").select("*").eq("user_id",_c.auth.currentUser!.id).order("created_at",ascending:false)) as List).cast<Map<String,dynamic>>();
}