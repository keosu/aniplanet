import type { Animal } from "./data";
import type { Language } from "./preferences";
import english from "./animals.en.json";

type AnimalText = Pick<
  Animal,
  "region" | "diet" | "size" | "lifespan" | "description" | "fact"
> & { chinaRegion?: string };
const statuses: Record<string, string> = {
  LC: "Least Concern",
  NT: "Near Threatened",
  VU: "Vulnerable",
  EN: "Endangered",
  CR: "Critically Endangered",
  DD: "Data Deficient",
  EW: "Extinct in the Wild",
  EX: "Extinct",
};

export function localizeAnimal(animal: Animal, language: Language): Animal {
  if (language === "zh") return animal;
  const text = (english as Record<string, AnimalText>)[animal.id];
  return {
    ...animal,
    ...text,
    name: animal.english,
    status: statuses[animal.statusCode] || animal.statusCode,
    china: animal.china
      ? { ...animal.china, region: text.chinaRegion! }
      : undefined,
  };
}
