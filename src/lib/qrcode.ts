import QRCode from "qrcode";

/**
 * Génère la matrice 2D officielle ISO/IEC 18004 via la librairie standard `qrcode`
 * pour garantir un scan instantané sur 100% des appareils photo iPhone et Android.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const safeText = text && text.trim().length > 0 ? text.trim() : "http://localhost:3000/qr-menu";
  const qr = QRCode.create(safeText, {
    errorCorrectionLevel: "M",
  });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(data[r * size + c]));
    }
    matrix.push(row);
  }

  return matrix;
}
