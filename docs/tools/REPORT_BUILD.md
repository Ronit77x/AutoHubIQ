# Rebuilding the formal report

The report is authored from the audited project sources and schema snapshot by
`build-project-report.cjs`. It produces `output/pdf/AutoHubIQ_Project_Report.pdf`
and `output/source/AutoHubIQ_Project_Report.md`. The source uses the authors'
supplied member details and shared contribution statement. It does not change
application code or database records.

On the Windows development machine, from the repository root:

```powershell
npm.cmd install --prefix tmp/report-tools --no-audit --no-fund pdfkit@0.20.2 pdfjs-dist@6.5.438 @napi-rs/canvas@1.1.1 svg-to-pdfkit
node docs/tools/render-course-diagrams.cjs
node docs/tools/build-project-report.cjs
node docs/tools/render-report-qa.cjs
```

The builder embeds installed Windows Times New Roman and Consolas fonts.
The QA script rasterizes all PDF pages under ignored `tmp/pdfs`, extracts text
and checks for blank pages and text outside the page content bounds. Inspect
every rendered page after layout changes. The current delivered report has
40 pages, no blank pages, and no out-of-bounds text items; all pages were
visually reviewed. The numbered dictionary tables repeat their column header
when a table continues onto another page.

The source rubric was visually inspected because its table content is embedded
as an image rather than extractable text. Its authentication maximum is four,
but its detailed Correct Execution cell says three. The report records that
discrepancy and does not assign marks.

Figure 1 shows the architecture; Figures 2-3 are key-only Chen overviews.
Appendix A contains the full ER and mapping sheets. Figure 4 reproduces a
historical pgAdmin integrity-output region, explicitly identified as historical;
its four checks were rerun in the 15 November audit. No current web-interface
screenshots or browser-interaction verification are implied by that figure.

Course-notation revision 16 November 2026: the main report includes key-only Chen
overviews and an appendix of all twelve A3 landscape vector sheets. The separate
output/pdf/AutoHubIQ_ER_and_Relational_Mapping.pdf contains just those twelve
sheets. ER attributes, keys, relationships and cardinalities are generated from
the audited metadata; the relational mapping retains every actual column.

To render the diagram PDF independently:

```powershell
node docs/tools/render-report-qa.cjs output/pdf/AutoHubIQ_ER_and_Relational_Mapping.pdf tmp/pdfs/course
```
