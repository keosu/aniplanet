import type { Animal } from "./data";

const icons: Record<string, string> = {
  lion: "🦁", elephant: "🐘", giraffe: "🦒", zebra: "🦓", cheetah: "🐆", rhino: "🦏",
  tiger: "🐅", panda: "🐼", gorilla: "🦍", orangutan: "🦧", redfox: "🦊", "brown-bear": "🐻",
  "blue-whale": "🐋", orca: "🐳", dolphin: "🐬", "whale-shark": "🦈", "sea-turtle": "🐢", manta: "🐟",
  "polar-bear": "🐻‍❄️", "emperor-penguin": "🐧", "arctic-fox": "🦊", walrus: "🦭", reindeer: "🦌", "snowy-owl": "🦉",
  fennec: "🦊", camel: "🐫", meerkat: "🐾", oryx: "🦌", addax: "🦌", ostrich: "🐦",
  flamingo: "🦩", hippo: "🦛", crocodile: "🐊", otter: "🦦", capybara: "🐾", crane: "🐦",
};
export const animalEmoji = (animal: Animal) => animal.emoji || icons[animal.id] || "🐾";
