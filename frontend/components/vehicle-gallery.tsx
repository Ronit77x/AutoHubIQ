"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CarFront, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import gallerySources from "../lib/demo-gallery-sources.json";

export interface VehicleImage {
  image_id: number;
  image_url: string;
  is_primary: boolean;
}

const references = new Map<string, { label: string; source: string }>(Object.entries(gallerySources).flatMap(([model, gallery]) =>
  gallery.photos.map(photo => [`/cars/gallery/${model}/${photo.view}.jpg`, { label: photo.label, source: photo.source }] as const)));

function Photo({ image, vehicle, thumbnail = false }: {
  image: VehicleImage; vehicle: string; thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
    <CarFront size={thumbnail ? 22 : 48} />
    {!thumbnail && <span className="text-sm">Photo unavailable. Choose another view.</span>}
  </span>;
  return <Image fill src={image.image_url}
    alt={`${vehicle} — ${references.get(image.image_url)?.label ?? (image.is_primary ? "Exterior" : "Vehicle photo")}`}
    sizes={thumbnail ? "112px" : "(max-width: 1024px) 100vw, 900px"}
    unoptimized={image.image_url.startsWith("/api/")}
    className={thumbnail ? "object-cover" : "object-contain"}
    onError={() => setFailed(true)} />;
}

export default function VehicleGallery({ images, vehicle, isDemo }: {
  images: VehicleImage[]; vehicle: string; isDemo: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  // Legacy placeholders are never useful vehicle photos, even before data migration.
  const photos = [...images].filter(image => !image.image_url.startsWith("https://placehold.co/"))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const index = Math.min(selected, Math.max(photos.length - 1, 0));
  const active = photos[index];
  const reference = active ? references.get(active.image_url) : undefined;
  const label = reference?.label ?? (active?.is_primary ? "Exterior" : "Vehicle photo");
  function move(direction: number) { setSelected((index + direction + photos.length) % photos.length); }

  if (!active) return <section aria-label="Vehicle photos" className="grid aspect-[4/3] place-items-center rounded-xl bg-slate-100 text-slate-400">
    <div className="text-center"><CarFront className="mx-auto" size={64} /><p className="mt-3 text-sm">No photos available</p></div>
  </section>;

  const navigation = (large = false) => photos.length > 1 && <>
    <button type="button" aria-label="Previous photo" onClick={() => move(-1)}
      className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 shadow-md ${large ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/95 text-slate-800 hover:bg-white"}`}><ChevronLeft size={22} /></button>
    <button type="button" aria-label="Next photo" onClick={() => move(1)}
      className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 shadow-md ${large ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/95 text-slate-800 hover:bg-white"}`}><ChevronRight size={22} /></button>
  </>;

  return <section aria-label={`${vehicle} photo gallery`} className="min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="relative aspect-[4/3] bg-slate-100">
      <button type="button" aria-label="Open enlarged photo gallery" onClick={() => dialog.current?.showModal()} className="absolute inset-0 h-full w-full cursor-zoom-in">
        <Photo key={active.image_url} image={active} vehicle={vehicle} />
      </button>
      {navigation()}
      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white">{isDemo ? "Reference photos" : "Vehicle photos"}</span>
      <button type="button" onClick={() => dialog.current?.showModal()} aria-label="Enlarge photo" className="absolute bottom-4 right-4 rounded-xl bg-white/95 p-2.5 text-slate-700 shadow-sm hover:bg-white"><Expand size={18} /></button>
    </div>
    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4" aria-live="polite">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="text-xs font-medium text-slate-500">{index + 1} / {photos.length} photos</p>
    </div>
    <div className="flex gap-2 overflow-x-auto px-4 pb-4" aria-label="Choose a vehicle view">
      {photos.map((photo, i) => <button key={photo.image_id} type="button" aria-pressed={i === index}
        aria-label={`Show ${references.get(photo.image_url)?.label ?? (photo.is_primary ? "exterior" : `photo ${i + 1}`)}`}
        onClick={() => setSelected(i)}
        className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 ${i === index ? "border-accent-600 ring-2 ring-accent-100" : "border-transparent opacity-70 hover:opacity-100"}`}>
        <Photo key={photo.image_url} image={photo} vehicle={vehicle} thumbnail />
      </button>)}
    </div>
    {isDemo && <div className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">
      Model reference images; colour, trim and equipment may differ from this illustrative listing.
      {reference && <> <a href={reference.source} target="_blank" rel="noreferrer" className="font-medium text-accent-700 underline">Photo source: {new URL(reference.source).hostname.replace("www.", "")}</a></>}
    </div>}

    <dialog ref={dialog} aria-label={`${vehicle} enlarged photos`}
      onKeyDown={event => {
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-6xl overflow-hidden rounded-xl border-0 bg-slate-950 p-4 text-white shadow-2xl backdrop:bg-slate-950/85">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div><p className="font-semibold">{vehicle}</p><p className="text-sm text-slate-400">{label} · {index + 1} / {photos.length}</p></div>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close enlarged gallery" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X size={22} /></button>
      </div>
      <div className="relative h-[65vh] min-h-48">
        <Photo key={active.image_url} image={active} vehicle={vehicle} />
        {navigation(true)}
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">Use the arrows to browse · Press Esc to close{isDemo ? " · Illustrative model reference photos" : ""}</p>
    </dialog>
  </section>;
}
