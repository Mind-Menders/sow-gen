import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import type { Sow, SowSections } from "@shared/schema";

interface ExportOptions {
  format: "pdf" | "word";
  header?: string;
  footer?: string;
}

// Helper function to strip HTML tags and get plain text
function stripHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

// Helper function to parse HTML content into structured data
function parseHTMLContent(html: string): Array<{ type: 'text' | 'table' | 'list', content: any, ordered?: boolean }> {
  if (!html || html.trim() === '') {
    return [{ type: 'text', content: '(No content)' }];
  }

  const items: Array<{ type: 'text' | 'table' | 'list', content: any, ordered?: boolean }> = [];
  
  // First, check if this is a simple text node (no HTML tags)
  if (!html.includes('<')) {
    return [{ type: 'text', content: html }];
  }

  // Extract tables first
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let lastIndex = 0;
  let match;
  let foundAnyTable = false;

  // Helper to extract lists
  function extractLists(text: string) {
    // Find all lists (ul/ol)
    const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
    let listMatch;
    let lastListIndex = 0;
    const out: Array<{ type: 'text' | 'list', content: any, ordered?: boolean }> = [];
    while ((listMatch = listRegex.exec(text)) !== null) {
      // Add text before list
      if (listMatch.index > lastListIndex) {
        const beforeList = text.substring(lastListIndex, listMatch.index);
        const plainText = stripHTML(beforeList);
        if (plainText.trim() && plainText !== '(No content)') {
          out.push({ type: 'text', content: plainText });
        }
      }
      // Extract list items
      const listType = listMatch[1];
      const listHTML = listMatch[2];
      const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let itemMatch;
      const items: string[] = [];
      while ((itemMatch = itemRegex.exec(listHTML)) !== null) {
        const itemText = stripHTML(itemMatch[1]).trim();
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) {
        out.push({ type: 'list', content: items, ordered: listType === 'ol' });
      }
      lastListIndex = listMatch.index + listMatch[0].length;
    }
    // Add remaining text after last list
    if (lastListIndex < text.length) {
      const afterList = text.substring(lastListIndex);
      const plainText = stripHTML(afterList);
      if (plainText.trim() && plainText !== '(No content)') {
        out.push({ type: 'text', content: plainText });
      }
    }
    return out;
  }

  while ((match = tableRegex.exec(html)) !== null) {
    foundAnyTable = true;
    // Add text before table, parse lists in that text
    if (match.index > lastIndex) {
      const textBefore = html.substring(lastIndex, match.index);
      extractLists(textBefore).forEach(i => items.push(i));
    }
    // Parse table
    const tableHTML = match[0];
    const tableData = parseTable(tableHTML);
    if (tableData.length > 0) {
      items.push({ type: 'table', content: tableData });
    }
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text after last table, parse lists in that text
  if (lastIndex < html.length) {
    const remainingText = html.substring(lastIndex);
    extractLists(remainingText).forEach(i => items.push(i));
  }
  // If no tables found, parse lists in all text
  if (!foundAnyTable || items.length === 0) {
    extractLists(html).forEach(i => items.push(i));
    if (items.length === 0) {
      items.push({ type: 'text', content: stripHTML(html) || '(No content)' });
    }
  }
  return items;
}

// Parse table HTML into 2D array
function parseTable(tableHTML: string): string[][] {
  const rows: string[][] = [];
  
  // Extract all rows (handle both tbody and direct tr)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(tableHTML)) !== null) {
    const rowHTML = rowMatch[1];
    const cells: string[] = [];
    
    // Extract cells (both th and td)
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
      const cellHTML = cellMatch[1];
      // Strip HTML from cell content but preserve line breaks
      const cellContent = stripHTML(cellHTML).trim();
      cells.push(cellContent || ' ');
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return rows;
}

export async function generatePDF(sow: Sow, sections: SowSections, options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Repeating header/footer helpers
    const drawHeader = () => {
      if (!options.header) return;
      const initialY = doc.y;
      doc.fontSize(10).fillColor("#666").text(options.header, {
        align: "center",
      });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      // Ensure content starts below header line
      // doc.y is already advanced by text and moveDown calls
    };

    const drawFooter = () => {
      if (!options.footer) return;
      const bottomY = doc.page.height - doc.page.margins.bottom + 10; // slightly into margin
      const lineY = bottomY - 20;
      doc.save();
      doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
      doc.fontSize(10).fillColor("#666").text(options.footer, 50, lineY + 4, {
        align: "center",
        width: doc.page.width - 100,
      });
      doc.restore();
    };

    // Draw on first page
    drawHeader();
    drawFooter();

    // Repeat on every new page
    doc.on("pageAdded", () => {
      drawHeader();
      drawFooter();
    });

    // Title and metadata
  doc.font('Helvetica-Bold').fontSize(24).fillColor("#000").text(sow.title, { align: "center", underline: false });
    doc.moveDown();
    doc.fontSize(10).fillColor("#666");
    doc.text(`SOW Number: ${sow.sowNumber}`, { align: "center" });
    doc.text(`Status: ${sow.status}`, { align: "center" });
    doc.text(`Vendor: ${sow.vendorName}`, { align: "center" });
    doc.moveDown(2);

    // Table of Contents
  doc.font('Helvetica-Bold').fontSize(18).fillColor("#000").text("TABLE OF CONTENTS", { align: "left" });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    const sectionsList = Object.values(sections);
    sectionsList.forEach((section, index) => {
  doc.font('Helvetica-Bold').fontSize(12).fillColor("#000").text((index + 1) + ". " + section.title, { align: "left" });
    });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.addPage();

    // Helper to get page bounds
    const pageTop = () => doc.page.margins.top;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;

    // Sections
    sectionsList.forEach((section, index) => {
      // Ensure there is enough space for a heading, otherwise start a new page
      if (doc.y > pageBottom() - 40) {
        doc.addPage();
      }
      // Add 2x spacing before section heading (except for first section after TOC)
      if (index > 0) {
        doc.moveDown(2);
      }
  doc.font('Helvetica-Bold').fontSize(16).fillColor("#000").text((index + 1) + ". " + section.title, { align: "left" });
      doc.moveDown(1.5); // 1.5x spacing after heading

      // Parse and render HTML content
      const contentItems = parseHTMLContent(section.content || "(No content)");

      contentItems.forEach(item => {
        if (item.type === 'text') {
          doc.fontSize(12).fillColor("#333").text(item.content, {
            align: "left",
            indent: 20,
            lineGap: 4, // Slightly more readable line spacing
          });
          doc.moveDown(1.5); // 1.5x spacing between paragraphs
        } else if (item.type === 'table') {
          // Render table in PDF
          const tableData = item.content as string[][];

          // Layout metrics
          const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - 40; // small side padding
          const startX = doc.page.margins.left + 20;
          const columns = Math.max(1, tableData[0]?.length || 1);
          const columnWidth = availableWidth / columns;
          const rowHeight = 24;

          const headerRow = tableData[0] || [];
          let y = doc.y;

          // Helper to draw a single row (and handle page breaks)
          const drawRow = (row: string[], isHeader: boolean) => {
            // If the next row won't fit, add a page and repeat header
            if (y + rowHeight > pageBottom()) {
              doc.addPage();
              y = doc.y;
              if (!isHeader && headerRow.length) {
                drawRow(headerRow, true);
              }
            }
            row.forEach((cell, colIndex) => {
              const x = startX + (colIndex * columnWidth);
              if (isHeader) {
                doc.save();
                doc.rect(x, y, columnWidth, rowHeight).fill("#f5f5f5");
                doc.restore();
              }
              doc.rect(x, y, columnWidth, rowHeight).stroke();
              doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
                .fillColor("#000")
                .text(cell || " ", x + 5, y + 6, {
                  width: columnWidth - 10,
                  height: rowHeight - 12,
                  align: "left",
                });
  // Reset font for regular content
  doc.font('Helvetica');
            });
            y += rowHeight;
          };
          tableData.forEach((row, rowIndex) => {
            drawRow(row, rowIndex === 0);
          });
          doc.y = y + 10;
          if (doc.y > pageBottom() - 20) {
            doc.addPage();
          }
        } else if (item.type === 'list') {
          // Render lists in PDF
          const isOrdered = !!item.ordered;
          item.content.forEach((li: string, idx: number) => {
            let bullet = isOrdered ? `${idx + 1}.` : '•';
            doc.fontSize(12).fillColor("#333").text(`${bullet} ${li}`, {
              align: "left",
              indent: 40,
              lineGap: 4,
            });
            doc.moveDown(0.75); // spacing between list items
          });
          doc.moveDown(1.5); // extra spacing after list
        }
      });

      doc.moveDown();

      if (index < sectionsList.length - 1) {
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }
    });

    // Footer is drawn per-page by drawFooter()

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
        spacing: { before: 800, after: 300 }, // 2x spacing before heading, 1.5x after
      })
    );
    // Parse and render HTML content
    const contentItems = parseHTMLContent(section.content || "(No content)");
    contentItems.forEach(item => {
      if (item.type === 'text') {
        docChildren.push(
          new Paragraph({
            text: item.content,
            spacing: { after: 300, line: 312 }, // 1.25x line spacing (312 twips = 1.25x of 240 base)
          })
        );
      } else if (item.type === 'table') {
        // Render table in Word
        const tableData = item.content as string[][];
        const tableRows = tableData.map((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          return new TableRow({
            children: row.map(cell => 
              new TableCell({
                children: [
                  new Paragraph({
                    text: cell,
                    ...(isHeader && { bold: true }),
                  })
                ],
                shading: isHeader ? {
                  fill: "F5F5F5",
                  color: "auto",
                } : undefined,
                margins: {
                  top: 100,
                  bottom: 100,
                  left: 100,
                  right: 100,
                },
              })
            ),
          });
        });
        docChildren.push(
          new Table({
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            },
          })
        );
        docChildren.push(
          new Paragraph({
            text: "",
            spacing: { after: 200 },
          })
        );
      } else if (item.type === 'list') {
        // Render true Word lists
        const isOrdered = !!item.ordered;
        item.content.forEach((li: string) => {
          docChildren.push(
            new Paragraph({
              text: li,
              bullet: !isOrdered ? { level: 0 } : undefined,
              numbering: isOrdered ? { reference: "numbered-list", level: 0 } : undefined,
              spacing: { after: 100, line: 312 },
            })
          );
        });
      }
    });
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
    numbering: {
      config: [
        {
          reference: "numbered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  });

  return await Packer.toBuffer(doc);
}
