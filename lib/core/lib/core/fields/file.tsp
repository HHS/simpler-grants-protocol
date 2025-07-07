namespace CommonGrants.Fields;

/** A field representing a downloadable file. */
@example(Examples.File.imageFile, #{ title: "An image file" })
@example(Examples.File.pdfFile, #{ title: "A PDF file" })
model File {
  /** The file's download URL. */
  downloadUrl: url;

  /** The file's name. */
  name: string;

  /** The file's description. */
  description?: string;

  /** The file's size in bytes. */
  sizeInBytes?: numeric;

  /** The file's MIME type. */
  mimeType?: string;

  /** The system metadata for the file. */
  ...Fields.SystemMetadata;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.File {
  const pdfFile = #{
    downloadUrl: "https://example.com/file.pdf",
    name: "example.pdf",
    description: "A PDF file with instructions",
    sizeInBytes: 1000,
    mimeType: "application/pdf",
    createdAt: utcDateTime.fromISO("2025-01-01T17:01:01"),
    lastModifiedAt: utcDateTime.fromISO("2025-01-02T17:30:00"),
  };

  const imageFile = #{
    downloadUrl: "https://example.com/image.png",
    name: "image.png",
    sizeInBytes: 1000,
    mimeType: "image/png",
    createdAt: utcDateTime.fromISO("2025-01-01T17:01:01"),
    lastModifiedAt: utcDateTime.fromISO("2025-01-02T17:30:00"),
  };
}
