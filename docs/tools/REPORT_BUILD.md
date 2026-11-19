# Rebuilding the formal report

Run from the repository root on the Windows development machine:

```powershell
npm.cmd install --prefix tmp/report-tools --no-audit --no-fund pdfkit@0.20.2 pdfjs-dist@6.5.438 @napi-rs/canvas@1.1.1 svg-to-pdfkit
node docs/tools/render-complete-er.cjs
node docs/tools/render-complete-relational.cjs
node docs/tools/build-project-report.cjs
node docs/tools/render-report-qa.cjs
```

The diagram generators read metadata using the local maintenance database URL; they do not read application records or change the database. They create one complete ER sheet and one relational sheet with connected foreign keys. Their SVG sources are saved in docs/diagrams and the PDFs in output/pdf.

The report builder embeds these two current sheets in Appendix A and produces the PDF and editable Markdown report. The old module diagrams and their generator have been removed.

The current report contains 30 pages. Automated rendering found no blank pages or text outside page bounds. Rendering output and contact sheets are stored under ignored tmp/pdfs for visual review. Installed Windows Times New Roman and Consolas fonts are used by the report.

The report's original implementation audit is dated 15 November 2026. Diagram metadata was checked against the current database on 19 November 2026; historical evidence is not a new application audit.
