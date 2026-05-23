"use client";
import { useEffect, useState } from "react";

export default function WasmDemoPage() {
  const [sum, setSum] = useState<string>("loading...");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const wasm = await import("../../wasm/easy_asphalt.js");
      await wasm.default();
      const result = wasm.add(20, 22);
      if (mounted) setSum(String(result));
    })().catch((err) => {
      if (mounted) setSum(String(err));
    });
    return () => { mounted = false; };
  }, []);

  return <main style={{ padding: 24 }}><h1>Rust WASM Demo</h1><p>20 + 22 = {sum}</p></main>;
}
