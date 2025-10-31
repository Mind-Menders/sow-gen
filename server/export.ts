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
function parseHTMLContent(html: string): Array<{ type: 'text' | 'table', content: any }> {
  if (!html || html.trim() === '') {
    return [{ type: 'text', content: '(No content)' }];
  }

  const items: Array<{ type: 'text' | 'table', content: any }> = [];
  
  // First, check if this is a simple text node (no HTML tags)
  if (!html.includes('<')) {
    return [{ type: 'text', content: html }];
  }
  
  // Extract tables first
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let lastIndex = 0;
  let match;
  let foundAnyTable = false;
  
  while ((match = tableRegex.exec(html)) !== null) {
    foundAnyTable = true;
    
    // Add text before table
    if (match.index > lastIndex) {
      const textBefore = html.substring(lastIndex, match.index);
      const plainText = stripHTML(textBefore);
      if (plainText.trim() && plainText !== '(No content)') {
        items.push({ type: 'text', content: plainText });
      }
    }
    
    // Parse table
    const tableHTML = match[0];
    const tableData = parseTable(tableHTML);
    if (tableData.length > 0) {
      items.push({ type: 'table', content: tableData });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last table
  if (lastIndex < html.length) {
    const remainingText = html.substring(lastIndex);
    const plainText = stripHTML(remainingText);
    if (plainText.trim() && plainText !== '(No content)') {
      items.push({ type: 'text', content: plainText });
    }
  }
  
  // If no tables found, return all as text (strip all HTML)
  if (!foundAnyTable || items.length === 0) {
    const plainText = stripHTML(html);
    items.push({ type: 'text', content: plainText || '(No content)' });
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
      
      // Parse and render HTML content
      const contentItems = parseHTMLContent(section.content || "(No content)");
      
      contentItems.forEach(item => {
        if (item.type === 'text') {
          doc.fontSize(12).fillColor("#333").text(item.content, {
            align: "left",
            indent: 20,
          });
          doc.moveDown();
        } else if (item.type === 'table') {
          // Render table in PDF
          const tableData = item.content as string[][];
          const startX = 70;
          let startY = doc.y;
          const columnWidth = 120;
          const rowHeight = 25;
          
          tableData.forEach((row, rowIndex) => {
            const isHeader = rowIndex === 0;
            
            row.forEach((cell, colIndex) => {
              const x = startX + (colIndex * columnWidth);
              const y = startY + (rowIndex * rowHeight);
              
              // Draw cell border
              doc.rect(x, y, columnWidth, rowHeight).stroke();
              
              // Fill header background
              if (isHeader) {
                doc.rect(x, y, columnWidth, rowHeight).fill("#f5f5f5");
                doc.rect(x, y, columnWidth, rowHeight).stroke();
              }
              
              // Draw cell text
              doc.fontSize(10)
                .fillColor("#000")
                .text(cell, x + 5, y + 7, {
                  width: columnWidth - 10,
                  height: rowHeight - 10,
                  align: "left",
                });
            });
          });
          
          // Move cursor below table
          doc.y = startY + (tableData.length * rowHeight) + 10;
          doc.moveDown();
        }
      });
      
      doc.moveDown();

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
      })
    );
    
    // Parse and render HTML content
    const contentItems = parseHTMLContent(section.content || "(No content)");
    
    contentItems.forEach(item => {
      if (item.type === 'text') {
        docChildren.push(
          new Paragraph({
            text: item.content,
            spacing: { after: 200 },
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
                    ...(isHeader && { 
                      bold: true,
                    }),
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
  });

  return await Packer.toBuffer(doc);
}
