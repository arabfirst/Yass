export type PoliceVehicle = {
  key: string;
  name: string;
  nameAr: string;
  desc: string;
  descAr: string;
  price: number;
  image: string;
  erlcNames: string[];
};

export const POLICE_VEHICLES_CATALOG: PoliceVehicle[] = [
  {
    key: "bullhorn_bh15_2009",
    name: "Bullhorn BH15 2009",
    nameAr: "بولهورن BH15 2009",
    desc: "Standard patrol vehicle — the main police cruiser used by all officers",
    descAr: "مركبة الدورية الأساسية المستخدمة من جميع عناصر الشرطة",
    price: 150000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/c/ca/Bullhorn_BH15_2009.png",
    erlcNames: ["Bullhorn BH15 2009", "BH15 2009", "BH15"],
  },
  {
    key: "chevlon_captain_2009",
    name: "Chevlon Captain 2009",
    nameAr: "شيفلون كابتن 2009",
    desc: "Patrol sedan — high-speed cruiser for general patrol duties",
    descAr: "سيدان دورية سريعة للمهام العامة",
    price: 160000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/4/48/Chevlon_Captain_2009.png",
    erlcNames: ["Chevlon Captain 2009", "Captain 2009", "Captain"],
  },
  {
    key: "navara_boundary_2022",
    name: "Navara Boundary 2022",
    nameAr: "نافارا باوندري 2022",
    desc: "Modern patrol SUV — new generation police utility vehicle",
    descAr: "SUV دورية حديثة — الجيل الجديد من مركبات الشرطة",
    price: 185000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/0/05/Navara_Boundary_2022.png",
    erlcNames: ["Navara Boundary 2022", "Boundary 2022", "Boundary"],
  },
  {
    key: "navara_imperium_2020",
    name: "Navara Imperium 2020",
    nameAr: "نافارا إمبيريوم 2020",
    desc: "Traffic patrol sedan — used by traffic enforcement units",
    descAr: "سيدان دورية مرور — تستخدمها وحدات إنفاذ قوانين المرور",
    price: 175000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/c/c3/Navara_Imperium_2020.png",
    erlcNames: ["Navara Imperium 2020", "Imperium 2020", "Imperium"],
  },
  {
    key: "overland_buckaroo_2018",
    name: "Overland Buckaroo 2018",
    nameAr: "أوفرلاند باكارو 2018",
    desc: "K9 / Utility SUV — police utility vehicle for K9 and rough terrain",
    descAr: "SUV K9 وخدمات — مركبة الكلاب البوليسية والتضاريس الوعرة",
    price: 200000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/4/4f/Overland_Buckaroo_2018.png",
    erlcNames: ["Overland Buckaroo 2018", "Buckaroo 2018", "Buckaroo"],
  },
  {
    key: "bullhorn_prancer_2015",
    name: "Bullhorn Prancer 2015",
    nameAr: "بولهورن برانسر 2015",
    desc: "Detective / Traffic unit — unmarked detective and traffic enforcement",
    descAr: "وحدة تحقيقات ومرور — سيارة المحققين وإنفاذ المرور",
    price: 210000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/5/50/Bullhorn_Prancer_2015.png",
    erlcNames: ["Bullhorn Prancer 2015", "Prancer 2015", "Prancer"],
  },
  {
    key: "chevlon_camion_2018",
    name: "Chevlon Camion 2018",
    nameAr: "شيفلون كاميون 2018",
    desc: "Police truck — heavy-duty patrol and transport vehicle",
    descAr: "شاحنة الشرطة — مركبة دورية ثقيلة ونقل",
    price: 225000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/f/fe/Chevlon_Camion_2018.png",
    erlcNames: ["Chevlon Camion 2018", "Camion 2018"],
  },
  {
    key: "vellfire_riptide_2020",
    name: "Vellfire Riptide 2020",
    nameAr: "فيلفاير ريبتايد 2020",
    desc: "Supervisor / Command SUV — used by senior officers and supervisors",
    descAr: "SUV قيادة وإشراف — تستخدمها الضباط الأقدم والمشرفون",
    price: 260000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/f/f9/Vellfire_Riptide_2020.png",
    erlcNames: ["Vellfire Riptide 2020", "Riptide 2020", "Riptide"],
  },
  {
    key: "stuttgart_executive_2021",
    name: "Stuttgart Executive 2021",
    nameAr: "شتوتغارت إكزيكيوتف 2021",
    desc: "Unmarked detective vehicle — undercover operations and investigations",
    descAr: "سيارة محقق مموهة — عمليات سرية وتحقيقات",
    price: 280000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/7/74/Stuttgart_Executive_2021.png",
    erlcNames: ["Stuttgart Executive 2021", "Executive 2021", "Stuttgart Executive"],
  },
  {
    key: "bullhorn_determinator_2008",
    name: "Bullhorn Determinator 2008",
    nameAr: "بولهورن ديترمينيتور 2008",
    desc: "Detective coupe — specialized detective investigations vehicle",
    descAr: "كوبيه تحقيقات — مركبة متخصصة للتحقيقات الجنائية",
    price: 240000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/b/ba/Bullhorn_Determinator_2008.png",
    erlcNames: ["Bullhorn Determinator 2008", "Determinator 2008", "Determinator"],
  },
  {
    key: "falcon_scavenger_2016",
    name: "Falcon Scavenger 2016",
    nameAr: "فالكون سكافنجر 2016",
    desc: "SWAT / Tactical SUV — heavy tactical operations vehicle",
    descAr: "SUV تكتيكي SWAT — مركبة عمليات تكتيكية ثقيلة",
    price: 350000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/4/4a/Falcon_Scavenger_2016.png",
    erlcNames: ["Falcon Scavenger 2016", "Scavenger 2016", "Scavenger"],
  },
  {
    key: "chevlon_revver_2005",
    name: "Chevlon Revver 2005",
    nameAr: "شيفلون ريفر 2005",
    desc: "Pursuit interceptor — high-speed vehicle for suspect pursuits",
    descAr: "مركبة مطاردة عالية السرعة — للمطاردات ووقف المشتبه بهم",
    price: 300000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/7/7a/Chevlon_Revver_2005.png",
    erlcNames: ["Chevlon Revver 2005", "Revver 2005", "Revver"],
  },
  {
    key: "bullhorn_bh15_2009_swat",
    name: "Bullhorn BH15 2009 (SWAT)",
    nameAr: "بولهورن BH15 2009 (SWAT)",
    desc: "SWAT armored patrol vehicle — heavy-duty entry vehicle",
    descAr: "مركبة دورية مدرعة SWAT — مركبة اقتحام ثقيلة",
    price: 420000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/c/ca/Bullhorn_BH15_2009.png",
    erlcNames: ["Bullhorn BH15 2009 SWAT", "BH15 SWAT", "SWAT BH15"],
  },
  {
    key: "chevlon_camion_2021_command",
    name: "Chevlon Camion 2021",
    nameAr: "شيفلون كاميون 2021",
    desc: "Command vehicle — mobile command post for senior commanders",
    descAr: "مركبة قيادة — مركز قيادة متنقل لكبار القادة",
    price: 480000,
    image: "https://static.wikia.nocookie.net/emergency-response-liberty-county/images/6/67/Chevlon_Inferno_1981.png",
    erlcNames: ["Chevlon Camion 2021", "Camion 2021"],
  },
];

export const ALL_ERLC_POLICE_NAMES: string[] = POLICE_VEHICLES_CATALOG.flatMap(v => v.erlcNames).map(n => n.toLowerCase());

export function findVehicleByErlcName(erlcName: string): PoliceVehicle | null {
  const lower = erlcName.toLowerCase().trim();
  return POLICE_VEHICLES_CATALOG.find(v =>
    v.erlcNames.some(n => n.toLowerCase() === lower || lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower))
  ) ?? null;
}
