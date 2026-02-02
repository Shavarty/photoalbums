import { NextResponse } from "next/server";
import { SocksProxyAgent } from "socks-proxy-agent";
import fetch from "node-fetch";

export async function GET() {
  try {
    const socksProxy = "socks5://127.0.0.1:12334";

    console.log("Testing SOCKS5 proxy:", socksProxy);

    // Тест БЕЗ прокси
    const responseWithoutProxy = await fetch("https://api.ipify.org?format=json");
    const dataWithoutProxy = await responseWithoutProxy.json();

    // Тест С SOCKS5 прокси
    const agent = new SocksProxyAgent(socksProxy);
    const responseWithProxy = await fetch("https://api.ipify.org?format=json", {
      agent: agent
    });
    const dataWithProxy = await responseWithProxy.json();

    return NextResponse.json({
      proxy_type: "SOCKS5",
      proxy_url: socksProxy,
      ip_without_proxy: dataWithoutProxy,
      ip_with_proxy: dataWithProxy
    });

  } catch (error: any) {
    console.error("Proxy test error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
