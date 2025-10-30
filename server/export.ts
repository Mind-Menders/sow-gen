import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents } from "docx";
import type { Sow, SowSections } from "@shared/schema";

interface ExportOptions {
  format: "pdf" | "word";
  header?: string;
  footer?: string;
}

export async function generatePDF(sow: Sow, sections: SowSections, options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header
    if (options.header) {
      doc.fontSize(10).fillColor("#666").text(options.header, { align: "center" });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
    }

    // Title and metadata
    doc.fontSize(24).fillColor("#000").text(sow.title, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666");
    doc.text(`SOW Number: ${sow.sowNumber}`, { align: "center" });
    doc.text(`Status: ${sow.status}`, { align: "center" });
    doc.text(`Vendor: ${sow.vendorName}`, { align: "center" });
    doc.moveDown(2);

    // Table of Contents
    doc.fontSize(18).fillColor("#000").text("TABLE OF CONTENTS");
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    const sectionsList = Object.values(sections);
    sectionsList.forEach((section, index) => {
      doc.fontSize(12).fillColor("#000").text(`${index + 1}. ${section.title}`);
    });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.addPage();

    // Sections
    sectionsList.forEach((section, index) => {
      doc.fontSize(16).fillColor("#000").text(`${index + 1}. ${section.title}`);
      doc.moveDown();
      doc.fontSize(12).fillColor("#333").text(section.content || "(No content)", {
        align: "left",
        indent: 20,
      });
      doc.moveDown(2);

      if (index < sectionsList.length - 1) {
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }
    });

    // Footer
    if (options.footer) {
      doc.addPage();
      doc.moveDown(10);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      doc.fontSize(10).fillColor("#666").text(options.footer, { align: "center" });
    }

    doc.end();
  });
}

export async function generateWord(sow: Sow, sections: SowSections, options: ExportOptions): Promise<Buffer> {
  const sectionsList = Object.values(sections);
  
  const docChildren: any[] = [];

  // Header
  if (options.header) {
    const headerLines = options.header.split("\n");
    headerLines.forEach((line) => {
      docChildren.push(
        new Paragraph({
          text: line,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
    });
    docChildren.push(
      new Paragraph({
        text: "─".repeat(80),
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Title and metadata
  docChildren.push(
    new Paragraph({
      text: sow.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `SOW Number: ${sow.sowNumber}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `Status: ${sow.status}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `Vendor: ${sow.vendorName}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Table of Contents
  docChildren.push(
    new Paragraph({
      text: "TABLE OF CONTENTS",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "─".repeat(80),
      spacing: { after: 200 },
    })
  );

  sectionsList.forEach((section, index) => {
    docChildren.push(
      new Paragraph({
        text: `${index + 1}. ${section.title}`,
        spacing: { after: 100 },
      })
    );
  });

  docChildren.push(
    new Paragraph({
      text: "─".repeat(80),
      spacing: { before: 200, after: 400 },
    })
  );

  // Sections
  sectionsList.forEach((section, index) => {
    docChildren.push(
      new Paragraph({
        text: `${index + 1}. ${section.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: section.content || "(No content)",
        spacing: { after: 300 },
      })
    );

    if (index < sectionsList.length - 1) {
      docChildren.push(
        new Paragraph({
          text: "─".repeat(80),
          spacing: { after: 200 },
        })
      );
    }
  });

  // Footer
  if (options.footer) {
    docChildren.push(
      new Paragraph({
        text: "─".repeat(80),
        spacing: { before: 400, after: 200 },
      })
    );
    const footerLines = options.footer.split("\n");
    footerLines.forEach((line) => {
      docChildren.push(
        new Paragraph({
          text: line,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        children: docChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
