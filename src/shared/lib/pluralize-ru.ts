const rules = new Intl.PluralRules("ru-RU");

export function pluralizeRu(count: number, forms: { one: string; few: string; many: string }): string {
  const category = rules.select(count);
  return category === "one" ? forms.one : category === "few" ? forms.few : forms.many;
}
