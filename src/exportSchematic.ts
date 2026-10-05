import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Mesh } from "three";
import { createAnimal } from "./models";
import type { Animal } from "./data";
import { Capacitor } from "@capacitor/core";

export async function exportSchematic(animal: Animal) {
  if (!animal.shape) throw new Error("No local schematic for this species");
  const { root, dispose } = createAnimal(animal);
  try {
    root.name = `${animal.english} — simplified schematic`;
    root.userData = {
      species: animal.latin,
      type: "Simplified educational schematic, not a realistic scan",
      source: "Wild Atlas",
      animations: "Not included",
    };
    const buffer = await new GLTFExporter().parseAsync(root, { binary: true });
    if (!(buffer instanceof ArrayBuffer))
      throw new Error("Expected a binary GLB");
    if (Capacitor.isNativePlatform()) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([buffer]));
      });
      const { uri } = await Filesystem.writeFile({
        path: `models/${animal.id}-schematic.glb`,
        data,
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({ title: animal.name, files: [uri] });
      return;
    }
    const url = URL.createObjectURL(
      new Blob([buffer], { type: "model/gltf-binary" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${animal.id}-schematic.glb`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } finally {
    dispose();
    root.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((m) => m.dispose());
      }
    });
  }
}
