/**
 * EXIF / Image metadata extractor (.jpg, .jpeg, .png, .tiff).
 * Mirrors C# EXIFDocument using the exifr library (Edge-compatible).
 */

import exifr from "exifr";
import type { FileMetadata } from "../types";
import { addUser, addUnique } from "../lib/metadata";

export async function extractExif(
  buffer: ArrayBuffer,
  metadata: FileMetadata,
  log: (msg: string, level?: "info" | "warn" | "error") => void
): Promise<void> {
  try {
    // Parse all available EXIF data
    const data = await exifr.parse(buffer, {
      // Include all tag groups
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,
      xmp: true,
      icc: false, // Skip ICC profile
      jfif: false,
      ihdr: false,
      // Return merged output
      mergeOutput: true,
      // Include unknown tags
      sanitize: false,
      translateKeys: true,
      translateValues: true,
    });

    if (!data) {
      log("No EXIF data found in image", "warn");
      return;
    }

    log("EXIF data parsed successfully");

    // ── Users ─────────────────────────────────────────────────
    const authorFields = [
      data.Artist,
      data.XPAuthor,
      data.CameraOwnerName,
      data.Copyright,
    ];
    for (const author of authorFields) {
      if (typeof author === "string" && author.trim()) {
        addUser(metadata, { value: author.trim(), isComputerUser: false });
      }
    }

    // ── Application / Software ────────────────────────────────
    if (data.Software) {
      metadata.applications.push({
        value: String(data.Software),
        source: "EXIF Software",
      });
    }
    if (data.ProcessingSoftware) {
      metadata.applications.push({
        value: String(data.ProcessingSoftware),
        source: "EXIF ProcessingSoftware",
      });
    }

    // ── Dates ─────────────────────────────────────────────────
    const dateFields = [
      data.DateTimeOriginal,
      data.DateTimeDigitized,
      data.DateTime,
      data.CreateDate,
      data.ModifyDate,
    ];
    for (const d of dateFields) {
      if (d instanceof Date) {
        if (!metadata.dates.creationDate) {
          metadata.dates.creationDate = d.toISOString();
        } else if (!metadata.dates.modificationDate) {
          metadata.dates.modificationDate = d.toISOString();
        }
      }
    }

    // ── Camera Model ──────────────────────────────────────────
    if (data.Model) {
      const make = data.Make ? `${data.Make} ` : "";
      addUnique(metadata.servers, `${make}${data.Model}`);
    }

    // ── Operating System (HostComputer tag) ───────────────────
    if (data.HostComputer) {
      metadata.operatingSystem = String(data.HostComputer);
    }

    // ── GPS ───────────────────────────────────────────────────
    if (data.latitude != null && data.longitude != null) {
      metadata.gps = {
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.GPSAltitude != null ? `${data.GPSAltitude}m` : undefined,
      };
      log(
        `GPS coordinates found: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`
      );
    }

    // ── Title / Description / Comments ────────────────────────
    if (data.ImageDescription) metadata.description = String(data.ImageDescription);
    if (data.XPTitle) metadata.title = String(data.XPTitle);
    if (data.XPComment) metadata.comments = String(data.XPComment);
    if (data.XPKeywords) metadata.keywords = String(data.XPKeywords);
    if (data.XPSubject) metadata.subject = String(data.XPSubject);

    // ── Makernotes (raw tag groups) ───────────────────────────
    // Store all remaining tags as makernotes for advanced users
    const knownKeys = new Set([
      "Artist",
      "XPAuthor",
      "CameraOwnerName",
      "Copyright",
      "Software",
      "ProcessingSoftware",
      "DateTimeOriginal",
      "DateTimeDigitized",
      "DateTime",
      "CreateDate",
      "ModifyDate",
      "Model",
      "Make",
      "HostComputer",
      "latitude",
      "longitude",
      "GPSAltitude",
      "ImageDescription",
      "XPTitle",
      "XPComment",
      "XPKeywords",
      "XPSubject",
    ]);

    const extras: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!knownKeys.has(key) && value != null) {
        extras[key] =
          value instanceof Date
            ? value.toISOString()
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);
      }
    }

    if (Object.keys(extras).length > 0) {
      metadata.makernotes["EXIF"] = extras;
      log(`Stored ${Object.keys(extras).length} additional EXIF tag(s)`);
    }
  } catch (err) {
    log(
      `EXIF extraction error: ${err instanceof Error ? err.message : err}`,
      "error"
    );
    throw err;
  }
}
