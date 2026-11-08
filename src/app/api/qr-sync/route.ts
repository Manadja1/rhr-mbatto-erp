import { NextResponse } from "next/server";
import os from "os";
import { PosOrder, InventoryItem } from "@/store/useRhrStore";

// Stockage mémoire côté serveur pour synchroniser en temps réel les commandes QR
// passées depuis le smartphone d'un client vers l'écran Caisse Bar/Resto (/pos)
interface ServerQrSyncState {
  qrOrders: PosOrder[];
  catalogSnapshot: InventoryItem[];
  updatedAt: string;
}

const globalForQrSync = globalThis as unknown as {
  rhrQrSyncState?: ServerQrSyncState;
};

if (!globalForQrSync.rhrQrSyncState) {
  globalForQrSync.rhrQrSyncState = {
    qrOrders: [],
    catalogSnapshot: [],
    updatedAt: new Date().toISOString(),
  };
}

function getLocalLanIp(): string | null {
  try {
    const nets = os.networkInterfaces();
    const candidates: { name: string; address: string; priority: number }[] = [];
    for (const name of Object.keys(nets)) {
      const ifaceList = nets[name];
      if (!ifaceList) continue;
      const lower = name.toLowerCase();
      // Ignorer les cartes virtuelles (WSL, Hyper-V, VirtualBox, Docker)
      if (
        lower.includes("vethernet") ||
        lower.includes("wsl") ||
        lower.includes("virtual") ||
        lower.includes("vbox") ||
        lower.includes("docker")
      ) {
        continue;
      }
      for (const net of ifaceList) {
        if (net.family === "IPv4" && !net.internal) {
          const priority =
            lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("wlan")
              ? 1
              : lower.includes("ethernet")
              ? 2
              : 3;
          candidates.push({ name, address: net.address, priority });
        }
      }
    }
    candidates.sort((a, b) => a.priority - b.priority);
    if (candidates.length > 0) {
      return candidates[0].address;
    }
  } catch {
    // Ignorer en environnement edge/serverless
  }
  return null;
}

export async function GET() {
  const state = globalForQrSync.rhrQrSyncState!;
  const lanIp = getLocalLanIp();
  return NextResponse.json({
    lanIp,
    qrOrders: state.qrOrders,
    catalogSnapshot: state.catalogSnapshot,
    updatedAt: state.updatedAt,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = globalForQrSync.rhrQrSyncState!;

    // 1. Le client vient de scanner un QR code et d'envoyer une commande depuis son téléphone
    if (body.action === "SUBMIT_QR_ORDER" && body.order) {
      const incoming: PosOrder = body.order;
      const exists = state.qrOrders.some((o) => o.id === incoming.id);
      if (!exists) {
        state.qrOrders = [incoming, ...state.qrOrders].slice(0, 50);
        state.updatedAt = new Date().toISOString();
      }
      return NextResponse.json({
        success: true,
        order: incoming,
        qrOrders: state.qrOrders,
      });
    }

    // 2. La caisse Bar/Resto met à jour le statut d'une commande QR (validée ou annulée) ou synchronise le catalogue
    if (body.action === "SYNC_FROM_POS") {
      if (Array.isArray(body.inventory)) {
        state.catalogSnapshot = body.inventory;
      }
      if (typeof body.resolvedOrderId === "string") {
        state.qrOrders = state.qrOrders.filter(
          (o) => o.id !== body.resolvedOrderId
        );
      }
      state.updatedAt = new Date().toISOString();
      return NextResponse.json({
        success: true,
        qrOrders: state.qrOrders,
      });
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

