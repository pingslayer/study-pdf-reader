import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSamplePdf() {
  const doc = await PDFDocument.create();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const courier = await doc.embedFont(StandardFonts.Courier);
  const courierBold = await doc.embedFont(StandardFonts.CourierBold);

  const pageWidth = 595.28; // A4 points
  const pageHeight = 841.89;

  // Helper to draw running header & footer
  function drawHeaderFooter(page, pageNum) {
    // Header
    page.drawText('OPERATING SYSTEMS: THREE EASY PIECES', {
      x: 50,
      y: pageHeight - 40,
      size: 9,
      font: helveticaOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawLine({
      start: { x: 50, y: pageHeight - 46 },
      end: { x: pageWidth - 50, y: pageHeight - 46 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Footer
    page.drawLine({
      start: { x: 50, y: 50 },
      end: { x: pageWidth - 50, y: 50 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    page.drawText(`CHAPTER 4. PROCESSES`, {
      x: 50,
      y: 36,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    const pageStr = `${pageNum}`;
    const numWidth = helvetica.widthOfTextAtSize(pageStr, 9);
    page.drawText(pageStr, {
      x: pageWidth - 50 - numWidth,
      y: 36,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // --- PAGE 1: Prose, Headings, Header/Footer ---
  {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawHeaderFooter(page, 41);

    let y = pageHeight - 90;

    page.drawText('Chapter 4', {
      x: 50,
      y,
      size: 24,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= 32;

    page.drawText('Processes and Virtualization', {
      x: 50,
      y,
      size: 20,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= 40;

    page.drawText('4.1 The Abstraction: A Process', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 25;

    const p1 = [
      'The most fundamental abstraction that the operating system provides to users',
      'is the process. Informally, a process is simply a running program. At any',
      'point in time, the program itself is just a lifeless thing: it sits on the',
      'disk, a bunch of instructions and perhaps static data, waiting to be executed.',
      'It is the operating system that takes these bytes and gets them running.',
    ];
    for (const line of p1) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 12;

    const p2 = [
      'To provide the illusion of multiple CPUs, the operating system creates the',
      'process abstraction. By running one process, then stopping it and running',
      'another, and so forth, the OS promotes the illusion that many virtual CPUs',
      'exist when in fact only one or a few physical CPUs are actually present.',
      'This basic technique is known as time sharing of the CPU.',
    ];
    for (const line of p2) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 12;

    const p3 = [
      'Time sharing allows users to run as many concurrent processes as they would',
      'like; the potential cost is performance, as each will run more slowly if the',
      'CPU must be shared. To implement virtualization of the CPU, the OS needs both',
      'some low-level machinery called mechanisms, and high-level intelligence',
      'known as policies.',
    ];
    for (const line of p3) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
  }

  // --- PAGE 2: Prose followed by Code, then Code followed by Prose ---
  {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawHeaderFooter(page, 42);

    let y = pageHeight - 80;

    page.drawText('4.2 Process Creation: The fork() System Call', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 25;

    const prose1 = [
      'To understand how a process is created, consider the following C program',
      'that utilizes the fork() system call to create a new child process.',
    ];
    for (const line of prose1) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 15;

    // Code block background and border
    const codeBoxTop = y + 8;
    const codeLines = [
      '#include <stdio.h>',
      '#include <stdlib.h>',
      '#include <unistd.h>',
      '',
      'int main(int argc, char *argv[]) {',
      '    printf("hello world (pid:%d)\\n", (int) getpid());',
      '    int rc = fork();',
      '    if (rc < 0) {',
      '        fprintf(stderr, "fork failed\\n");',
      '        exit(1);',
      '    } else if (rc == 0) {',
      '        printf("child process (pid:%d)\\n", (int) getpid());',
      '    } else {',
      '        printf("parent of %d (pid:%d)\\n", rc, (int) getpid());',
      '    }',
      '    return 0;',
      '}',
    ];
    const codeHeight = codeLines.length * 15 + 16;
    page.drawRectangle({
      x: 50,
      y: codeBoxTop - codeHeight,
      width: pageWidth - 100,
      height: codeHeight,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
    });

    let codeY = codeBoxTop - 18;
    for (const line of codeLines) {
      if (line.length > 0) {
        page.drawText(line, {
          x: 65,
          y: codeY,
          size: 9.5,
          font: courier,
          color: rgb(0.1, 0.15, 0.2),
        });
      }
      codeY -= 15;
    }

    y = codeBoxTop - codeHeight - 24;

    const prose2 = [
      'When this program runs, the operating system creates a nearly exact copy',
      'of the calling process. Notice that the child process does not start at main;',
      'rather, it returns from fork as if it had called fork itself.',
      'The return value from fork is different in the parent and child: the child',
      'receives 0, while the parent receives the PID of the newly created child.',
    ];
    for (const line of prose2) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
  }

  // --- PAGE 3: Diagram with a Caption ---
  {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawHeaderFooter(page, 43);

    let y = pageHeight - 80;

    page.drawText('4.3 Process States and Transitions', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 25;

    const prose1 = [
      'In a simplified view, a process can be in one of three states: Running,',
      'Ready, or Blocked. The transitions between these states govern process scheduling.',
    ];
    for (const line of prose1) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 20;

    // Draw state diagram
    const diagramBoxY = y - 130;
    page.drawRectangle({
      x: 50,
      y: diagramBoxY,
      width: pageWidth - 100,
      height: 130,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.85, 0.85, 0.88),
      borderWidth: 1,
    });

    // Boxes: READY, RUNNING, BLOCKED
    const boxW = 80;
    const boxH = 34;

    // Ready box
    page.drawRectangle({
      x: 100,
      y: diagramBoxY + 50,
      width: boxW,
      height: boxH,
      color: rgb(0.88, 0.93, 1),
      borderColor: rgb(0.3, 0.5, 0.8),
      borderWidth: 1.5,
    });
    page.drawText('READY', {
      x: 120,
      y: diagramBoxY + 62,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.25, 0.5),
    });

    // Running box
    page.drawRectangle({
      x: 320,
      y: diagramBoxY + 50,
      width: boxW,
      height: boxH,
      color: rgb(0.88, 0.98, 0.9),
      borderColor: rgb(0.2, 0.6, 0.3),
      borderWidth: 1.5,
    });
    page.drawText('RUNNING', {
      x: 332,
      y: diagramBoxY + 62,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.4, 0.2),
    });

    // Blocked box
    page.drawRectangle({
      x: 210,
      y: diagramBoxY + 10,
      width: boxW,
      height: boxH,
      color: rgb(1, 0.93, 0.88),
      borderColor: rgb(0.8, 0.4, 0.2),
      borderWidth: 1.5,
    });
    page.drawText('BLOCKED', {
      x: 221,
      y: diagramBoxY + 22,
      size: 11,
      font: helveticaBold,
      color: rgb(0.5, 0.2, 0.1),
    });

    // Connecting arrows / text
    page.drawText('Schedule ->', {
      x: 210,
      y: diagramBoxY + 75,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText('<- Deschedule', {
      x: 205,
      y: diagramBoxY + 56,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    y = diagramBoxY - 20;

    // Caption
    page.drawText('Figure 4.1: Simplified Process State Transitions', {
      x: 145,
      y,
      size: 10,
      font: helveticaBold,
      color: rgb(0.2, 0.25, 0.35),
    });
    y -= 25;

    const prose2 = [
      'As shown in the figure above, a process moves from Running to Blocked when',
      'waiting for an I/O request to complete. Once the request finishes, an',
      'interrupt moves it back to the Ready queue.',
    ];
    for (const line of prose2) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
  }

  // --- PAGE 4: Mathematical Equations ---
  {
    const page = doc.addPage([pageWidth, pageHeight]);
    drawHeaderFooter(page, 44);

    let y = pageHeight - 80;

    page.drawText('4.4 CPU Scheduling Metrics', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.15, 0.2, 0.3),
    });
    y -= 25;

    const prose1 = [
      'To evaluate scheduling policies, we define turnaround time as the time at',
      'which the job completes minus the time at which the job arrived in the system:',
    ];
    for (const line of prose1) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 15;

    // Centered equation 1
    page.drawText('T_turnaround = T_completion - T_arrival', {
      x: 160,
      y,
      size: 12,
      font: courierBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('(Equation 4.1)', {
      x: 440,
      y,
      size: 10,
      font: helveticaOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    const prose2 = [
      'Another metric of interest is fairness, often formalized through',
      'Jains Fairness Index which measures allocation across n jobs:',
    ];
    for (const line of prose2) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
    y -= 15;

    // Centered equation 2
    page.drawText('J(x_1, x_2, ..., x_n) = (sum(x_i))^2 / (n * sum(x_i^2))', {
      x: 105,
      y,
      size: 12,
      font: courierBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('(Equation 4.2)', {
      x: 440,
      y,
      size: 10,
      font: helveticaOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 35;

    const prose3 = [
      'Tradeoffs between turnaround time and fairness are central to operating',
      'system scheduler design. Optimizing one often comes at the expense of the other.',
    ];
    for (const line of prose3) {
      page.drawText(line, { x: 50, y, size: 11, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 16;
    }
  }

  const pdfBytes = await doc.save();
  const outDir = path.resolve('client/public/samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'ostep_sample.pdf');
  fs.writeFileSync(outFile, pdfBytes);
  console.log('Sample OSTEP PDF generated successfully at:', outFile);
}

generateSamplePdf().catch(console.error);
