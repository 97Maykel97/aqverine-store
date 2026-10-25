export interface ProductFitProfile {
  fit: string;
  measurementTip: string;
  columns: readonly string[];
  measurements: readonly { size: string; values: readonly number[] }[];
}

const apparelSizes = ["S", "M", "L", "XL"] as const;

const rows = (sizes: readonly string[], values: readonly (readonly number[])[]): ProductFitProfile["measurements"] =>
  sizes.map((size, index) => ({ size, values: values[index] }));

export const productFitProfiles: Readonly<Record<string, ProductFitProfile>> = {
  "essential-t-shirt": {
    fit: "Свободная прямая посадка. Для более собранного силуэта сравни замеры с любимой футболкой.",
    measurementTip: "Ширина по груди измеряется у разложенного изделия от одной подмышки до другой. Это не обхват тела.",
    columns: ["Ширина по груди", "Длина", "Рукав"],
    measurements: rows(apparelSizes, [[52, 68, 22], [54, 70, 23], [56, 72, 24], [58, 74, 25]]),
  },
  "everyday-hoodie": {
    fit: "Свободная посадка с запасом для дополнительного слоя под худи.",
    measurementTip: "Ширина по груди измеряется у разложенного изделия от одной подмышки до другой; рукав — от плечевого шва.",
    columns: ["Ширина по груди", "Длина", "Рукав"],
    measurements: rows(apparelSizes, [[56, 68, 60], [58, 70, 61], [60, 72, 62], [62, 74, 63]]),
  },
  "oversize-shirt": {
    fit: "Выраженный oversize: свободно в плечах и по корпусу. Не обязательно брать размер больше обычного.",
    measurementTip: "Ширина по груди измеряется у разложенного изделия от одной подмышки до другой; рукав — от плечевого шва.",
    columns: ["Ширина по груди", "Длина", "Рукав"],
    measurements: rows(["S", "M", "L"], [[58, 72, 56], [60, 74, 57], [62, 76, 58]]),
  },
  "relaxed-trousers": {
    fit: "Свободные брючины и расслабленная линия бёдер. Сравни ширину пояса со своими брюками.",
    measurementTip: "Ширина пояса и бёдер указана по разложенному изделию; шаговый шов — от паха до низа.",
    columns: ["Ширина пояса", "Ширина бёдер", "Шаговый шов"],
    measurements: rows(apparelSizes, [[36, 54, 74], [38, 56, 75], [40, 58, 76], [42, 60, 77]]),
  },
  "core-denim-jacket": {
    fit: "Прямой свободный крой: под курткой остаётся место для футболки или тонкого слоя.",
    measurementTip: "Ширина по груди измеряется у разложенного изделия от одной подмышки до другой; рукав — от плечевого шва.",
    columns: ["Ширина по груди", "Длина", "Рукав"],
    measurements: rows(apparelSizes, [[54, 63, 60], [56, 65, 61], [58, 67, 62], [60, 69, 63]]),
  },
  "canvas-tote": {
    fit: "Один размер. Вместительный шопер, который удобно носить на плече.",
    measurementTip: "Ширина и высота относятся к корпусу сумки; длина ручек указана целиком.",
    columns: ["Ширина", "Высота", "Длина ручек"],
    measurements: rows(["ONE SIZE"], [[38, 42, 60]]),
  },
};

export const getProductFitProfile = (slug: string): ProductFitProfile | undefined => productFitProfiles[slug];
