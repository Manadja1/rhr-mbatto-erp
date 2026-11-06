"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface RhrLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  forceSvg?: boolean;
  showTextSide?: boolean;
}

export function RhrLogo({
  className,
  size = "md",
  variant = "light",
  forceSvg = false,
  showTextSide = false,
}: RhrLogoProps) {
  const [imgError, setImgError] = useState(false);

  const dimensions = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm border border-black/5 shrink-0",
          dimensions
        )}
      >
        {!imgError && !forceSvg ? (
          <img
            src="/logo-rhr.jpg"
            alt="RHR - Résidence Hôtel Le Rêve de M'Batto"
            className="h-full w-full object-contain p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <RhrLogoSvg className="h-full w-full p-1" />
        )}
      </div>

      {showTextSide && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-black tracking-tight",
                size === "sm" ? "text-base" : size === "md" ? "text-lg" : "text-2xl",
                variant === "dark" ? "text-white" : "text-rhr-dark"
              )}
            >
              RHR
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rhr-gold" />
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-widest",
                variant === "dark" ? "text-rhr-gold" : "text-rhr-burgundy"
              )}
            >
              M&apos;BATTO
            </span>
          </div>
          <span
            className={cn(
              "text-xs font-semibold tracking-wide",
              variant === "dark" ? "text-gray-300" : "text-gray-700"
            )}
          >
            Résidence Hôtel Le Rêve
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Fallback SVG haute fidélité reproduisant exactement le toit rouge bordeaux asymétrique
 * au-dessus des lettres noires "RHR - RÉSIDENCE HÔTEL LE RÊVE DE M'BATTO"
 */
export function RhrLogoSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="RHR - Résidence Hôtel Le Rêve de M'Batto"
    >
      <rect width="500" height="500" rx="24" fill="#FFFFFF" />
      {/* Pilier vertical gauche rouge bordeaux */}
      <rect x="68" y="82" width="26" height="350" fill="#7C0A02" />
      {/* Toit asymétrique rouge bordeaux avec retour à droite */}
      <path
        d="M12 286 L248 48 L482 286 L418 286"
        stroke="#7C0A02"
        strokeWidth="26"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Lettres centrales RHR en noir profond */}
      <text
        x="255"
        y="265"
        textAnchor="middle"
        fill="#111315"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="900"
        fontSize="112"
        letterSpacing="-2"
      >
        RHR
      </text>
      {/* Sous-titre RÉSIDENCE HÔTEL LE RÊVE */}
      <text
        x="255"
        y="304"
        textAnchor="middle"
        fill="#111315"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="800"
        fontSize="24"
        letterSpacing="0.5"
      >
        RÉSIDENCE HÔTEL LE RÊVE
      </text>
      {/* Mention DE M'BATTO en rouge bordeaux */}
      <text
        x="255"
        y="340"
        textAnchor="middle"
        fill="#7C0A02"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="600"
        fontSize="27"
        letterSpacing="1"
      >
        DE M&apos;BATTO
      </text>
    </svg>
  );
}

