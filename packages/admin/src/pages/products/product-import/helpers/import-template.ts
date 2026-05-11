const ProductImportCSV =
  "data:text/csv;charset=utf-8," +
  `Product Id,Product Handle,Product Title,Product Subtitle,Product Description,Product Status,Product Thumbnail,Product Weight,Product Length,Product Width,Product Height,Product HS Code,Product Origin Country,Product MID Code,Product Material,Product Collection Id,Product Type Id,Product Tag 1,Product Discountable,Product External Id,Variant Id,Variant Title,Variant SKU,Variant Barcode,Variant Allow Backorder,Variant Manage Inventory,Variant Weight,Variant Length,Variant Width,Variant Height,Variant HS Code,Variant Origin Country,Variant MID Code,Variant Material,Variant Price EUR,Variant Price USD,Variant Option 1 Name,Variant Option 1 Value,Product Image 1 Url,Product Image 2 Url
,sefer-ledugma-1,ספר לדוגמה 1,,ספר לדוגמה ראשון למטרות ייבוא קטלוג.,published,,300,,,,,,,,,,,TRUE,,,כריכה רכה,,,FALSE,TRUE,,,,,,,,,12,14,כריכה,כריכה רכה,,
,sefer-ledugma-2,ספר לדוגמה 2,,ספר לדוגמה שני למטרות ייבוא קטלוג.,published,,300,,,,,,,,,,,TRUE,,,כריכה רכה,,,FALSE,TRUE,,,,,,,,,18,20,כריכה,כריכה רכה,,
,sefer-ledugma-2,ספר לדוגמה 2,,ספר לדוגמה שני למטרות ייבוא קטלוג.,published,,300,,,,,,,,,,,TRUE,,,כריכה קשה,,,FALSE,TRUE,,,,,,,,,22,25,כריכה,כריכה קשה,,`

export const getProductImportCsvTemplate = () => {
  return encodeURI(ProductImportCSV)
}
