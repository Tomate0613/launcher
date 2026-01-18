import { vanilla } from 'tomate-loaders';

export async function getJavaVersion(gameVersion: string): Promise<{
  majorVersion: number;
  component: string;
}> {
  const manifest = await vanilla.getVersionManifest();
  const version = manifest.versions.find(
    (version) => version.id === gameVersion,
  );

  if (!version) {
    throw new Error(`Game version ${gameVersion} not found`);
  }

  const data = await (await fetch(version.url)).json();
  return data.javaVersion;
}
