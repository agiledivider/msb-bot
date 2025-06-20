import PDFDocument from "pdfkit";

export class CodePdf {
    // @ts-ignore
    doc: PDFDocument
    private codes: string[];
    constructor(codes: string[]) {
        this.doc = new PDFDocument({size: 'A4'});
        this.doc.registerFont('SourceCodePro', __dirname + '/fonts/SourceCodePro-Semibold.ttf');
        this.codes = codes
    }

    toPoints(mm:number): number {
        return mm / 25.4 * 72;
    }


    renderCodeParts(code: string, y: number): void {
        const xStart = this.toPoints(20)
        this.doc.image(__dirname + '/images/makerspace-discord-qr-code.png', this.toPoints(5) + xStart, y + this.toPoints(1), { height: this.toPoints(48) });
        this.doc.strokeColor('#cecece')
            .rect(xStart,y, this.toPoints(170), this.toPoints(50))
            .stroke();
        this.doc
            .font('Helvetica-Bold')
            .fontSize(30)
            .fillColor('#cecece')
            .text('makerspacebonn.de', this.toPoints(60) +xStart, y + this.toPoints(2));
        this.doc
            .font('SourceCodePro')
            .fillColor('black')
            .fontSize(45)
            .text(code, this.toPoints(59) + xStart, y + this.toPoints(12));
        this.doc
            .font('SourceCodePro')
            .fontSize(10)
            .fillColor('black')
            .text('Einfach im Kanal #public /membercode eingeben und dann den Code. Danach solltest Du den Mitgliederbereich sehen.', this.toPoints(60) + xStart, y + this.toPoints(34), { align: 'left', width: this.toPoints(100) });
    }

    async getPdfBuffer(): Promise<Buffer> {

        const chunks: Buffer[] = [];
        this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));

        this.codes.forEach((code, index) => {
            if (index > 0 && index % 5 === 0) {
                this.doc.addPage();
            }
            this.renderCodeParts(code, 50 + (index % 5) * this.toPoints(50));
        })

        this.doc.end();

        // Wait for the PDF to be fully generated
        await new Promise((resolve) => this.doc.on('end', resolve));

        // Combine the chunks into a single Buffer
        const pdfBuffer = Buffer.concat(chunks);
        return Buffer.concat(chunks);
    }
}
