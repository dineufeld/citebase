// Minimal stubs for browser-only DOMMatrix / ImageData / Path2D globals.
// pdfjs-dist@5's legacy build references these at module-init time even when
// the caller only asks for text extraction. On Node + Vercel they don't
// exist, so we install no-op classes that satisfy `instanceof` and method
// calls without providing any real rendering.
//
// We only install the shims if they don't already exist, so a browser
// environment is unaffected.

type StubTarget = {
  DOMMatrix?: unknown;
  ImageData?: unknown;
  Path2D?: unknown;
};

const target = globalThis as unknown as StubTarget;

// Use opaque class expressions so the `lib.dom` TypeScript types don't
// interfere with our shim declarations. We only care about runtime presence.
const StubMatrix: new (...args: never[]) => unknown = (function () {
  function Cls(this: unknown) {
    (this as Record<string, unknown>).a = 1;
    (this as Record<string, unknown>).b = 0;
    (this as Record<string, unknown>).c = 0;
    (this as Record<string, unknown>).d = 1;
    (this as Record<string, unknown>).e = 0;
    (this as Record<string, unknown>).f = 0;
    (this as Record<string, unknown>).m11 = 1;
    (this as Record<string, unknown>).m12 = 0;
    (this as Record<string, unknown>).m13 = 0;
    (this as Record<string, unknown>).m14 = 0;
    (this as Record<string, unknown>).m21 = 0;
    (this as Record<string, unknown>).m22 = 1;
    (this as Record<string, unknown>).m23 = 0;
    (this as Record<string, unknown>).m24 = 0;
    (this as Record<string, unknown>).m31 = 0;
    (this as Record<string, unknown>).m32 = 0;
    (this as Record<string, unknown>).m33 = 1;
    (this as Record<string, unknown>).m34 = 0;
    (this as Record<string, unknown>).m41 = 0;
    (this as Record<string, unknown>).m42 = 0;
    (this as Record<string, unknown>).m43 = 0;
    (this as Record<string, unknown>).m44 = 1;
    (this as Record<string, unknown>).is2D = true;
    (this as Record<string, unknown>).isIdentity = true;
  }
  (Cls.prototype as Record<string, unknown>) = {
    inverseSelf() {
      return this;
    },
    invertSelf() {
      return this;
    },
    multiplySelf() {
      return this;
    },
    preMultiplySelf() {
      return this;
    },
    translateSelf() {
      return this;
    },
    scaleSelf() {
      return this;
    },
    rotateSelf() {
      return this;
    },
    rotateAxisAngleSelf() {
      return this;
    },
    rotateFromVectorSelf() {
      return this;
    },
    flipXSelf() {
      return this;
    },
    flipYSelf() {
      return this;
    },
    skewXSelf() {
      return this;
    },
    skewYSelf() {
      return this;
    },
    scale3dSelf() {
      return this;
    },
    setMatrixValue() {
      return this;
    },
    transformPoint(p: { x: number; y: number }) {
      return p;
    },
    toFloat32Array() {
      return new Float32Array(16);
    },
    toFloat64Array() {
      return new Float64Array(16);
    },
    toString() {
      return 'matrix(1, 0, 0, 1, 0, 0)';
    },
  };
  return Cls as unknown as new (...args: never[]) => unknown;
})();

const StubPath: new (...args: never[]) => unknown = (function () {
  function Cls(this: unknown) {
    return this;
  }
  (Cls.prototype as Record<string, unknown>) = {
    addPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    quadraticCurveTo() {},
    arc() {},
    arcTo() {},
    ellipse() {},
    rect() {},
  };
  return Cls as unknown as new (...args: never[]) => unknown;
})();

class StubImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace = 'srgb' as const;
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

if (typeof target.DOMMatrix === 'undefined') {
  (target as { DOMMatrix: unknown }).DOMMatrix = StubMatrix;
}
if (typeof target.Path2D === 'undefined') {
  (target as { Path2D: unknown }).Path2D = StubPath;
}
if (typeof target.ImageData === 'undefined') {
  (target as { ImageData: unknown }).ImageData = StubImageData;
}
