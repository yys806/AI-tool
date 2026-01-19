"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

export type QrDotsType =
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";

export type QrCornerSquareType = "dot" | "square" | "extra-rounded";

export type QrCornerDotType = "dot" | "square";

export type QrRendererProps = {
  data: string;
  size: number;
  margin: number;
  dotsType: QrDotsType;
  dotsColor: string;
  cornersSquareType: QrCornerSquareType;
  cornersDotType: QrCornerDotType;
  cornersColor: string;
  backgroundColor: string;
  image?: string | null;
  imageSize: number;
  imageMargin: number;
  hideBackgroundDots: boolean;
};

export function QrRenderer({
  data,
  size,
  margin,
  dotsType,
  dotsColor,
  cornersSquareType,
  cornersDotType,
  cornersColor,
  backgroundColor,
  image,
  imageSize,
  imageMargin,
  hideBackgroundDots,
}: QrRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (qrRef.current) return;
    qrRef.current = new QRCodeStyling({
      width: size,
      height: size,
      data: data || " ",
      margin,
      dotsOptions: {
        type: dotsType,
        color: dotsColor,
      },
      cornersSquareOptions: {
        type: cornersSquareType,
        color: cornersColor,
      },
      cornersDotOptions: {
        type: cornersDotType,
        color: cornersColor,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      image: image || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        imageSize,
        margin: imageMargin,
        hideBackgroundDots,
      },
    });

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      qrRef.current.append(containerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!qrRef.current) return;
    qrRef.current.update({
      width: size,
      height: size,
      data: data || " ",
      margin,
      dotsOptions: {
        type: dotsType,
        color: dotsColor,
      },
      cornersSquareOptions: {
        type: cornersSquareType,
        color: cornersColor,
      },
      cornersDotOptions: {
        type: cornersDotType,
        color: cornersColor,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      image: image || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        imageSize,
        margin: imageMargin,
        hideBackgroundDots,
      },
    });
  }, [
    data,
    size,
    margin,
    dotsType,
    dotsColor,
    cornersSquareType,
    cornersDotType,
    cornersColor,
    backgroundColor,
    image,
    imageSize,
    imageMargin,
    hideBackgroundDots,
  ]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
