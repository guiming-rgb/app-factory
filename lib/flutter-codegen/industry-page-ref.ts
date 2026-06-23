import type { AppSpec, AppSpecScreen } from "@/lib/app-spec/types";
import { isListScreen } from "@/lib/app-spec/resolve-list-screen";
import type { IndustryCategory } from "./emit-industry";

/** 各行业 list/detail/form 页面类名（与 templates/industry-* 一致） */
export const INDUSTRY_PAGE_CLASSES: Record<
  Exclude<IndustryCategory, "generic">,
  { list: string; detail: string; form: string }
> = {
  finance: { list: "TransactionListPage", detail: "TransactionDetailPage", form: "TransactionFormPage" },
  crm: { list: "ContactListPage", detail: "ContactDetailPage", form: "ContactFormPage" },
  fitness: { list: "WorkoutListPage", detail: "WorkoutDetailPage", form: "WorkoutFormPage" },
  ecommerce: { list: "ProductListPage", detail: "ProductDetailPage", form: "ProductFormPage" },
  education: { list: "CourseListPage", detail: "CourseDetailPage", form: "CourseFormPage" },
  social: { list: "PostListPage", detail: "PostDetailPage", form: "PostFormPage" },
  food: { list: "RestaurantListPage", detail: "RestaurantDetailPage", form: "RestaurantFormPage" },
  hotel: { list: "HotelListPage", detail: "HotelDetailPage", form: "HotelFormPage" },
  recruitment: { list: "JobListPage", detail: "JobDetailPage", form: "JobFormPage" },
  property: { list: "RepairListPage", detail: "RepairDetailPage", form: "RepairFormPage" },
  video: { list: "VideoItemListPage", detail: "VideoItemDetailPage", form: "VideoItemFormPage" },
  weather: { list: "CityListPage", detail: "CityDetailPage", form: "CityFormPage" },
  sports: { list: "MatchItemListPage", detail: "MatchItemDetailPage", form: "MatchItemFormPage" },
  photo: { list: "PhotoItemListPage", detail: "PhotoItemDetailPage", form: "PhotoItemFormPage" },
  dating: { list: "ProfileListPage", detail: "ProfileDetailPage", form: "ProfileFormPage" },
  medical: { list: "DoctorListPage", detail: "DoctorDetailPage", form: "DoctorFormPage" },
  blog: { list: "ArticleListPage", detail: "ArticleDetailPage", form: "ArticleFormPage" },
  game: { list: "GameScoreListPage", detail: "GameScoreDetailPage", form: "GameScoreFormPage" },
  payment: { list: "PaymentOrderListPage", detail: "PaymentOrderDetailPage", form: "PaymentOrderFormPage" },
};

function primaryListScreen(spec: AppSpec): AppSpecScreen | undefined {
  return spec.screens.find((s) => s.type === "list" || isListScreen(s, spec));
}

export function resolveIndustryPageRef(
  screen: AppSpecScreen,
  industry: IndustryCategory,
  spec?: AppSpec
): { importPath: string; className: string } | null {
  if (industry === "generic") return null;
  const pages = INDUSTRY_PAGE_CLASSES[industry];
  if (!pages) return null;

  const feature = industry;

  if (screen.type === "list") {
    const primary = spec ? primaryListScreen(spec) : undefined;
    if (primary && primary.id !== screen.id) return null;
    return {
      importPath: `../features/${feature}/pages/list_page.dart`,
      className: pages.list,
    };
  }
  return null;
}
