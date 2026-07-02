const KV_KEY = 'race-state';
const DEFAULT_STATE = { version: 0, active: [], results: [] };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

async function readState(kv) {
  const raw = await kv.get(KV_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw);
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 0,
      active: Array.isArray(parsed.active) ? parsed.active : [],
      results: Array.isArray(parsed.results) ? parsed.results : []
    };
  } catch (err) {
    return DEFAULT_STATE;
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  try {
    const state = await readState(context.env.RACE_KV);
    return jsonResponse(state, 200);
  } catch (err) {
    return jsonResponse({ error: String(err && err.message || err) }, 500);
  }
}

// 複数端末からの同時書き込みで片方が消えないよう、バージョン番号による
// 楽観的排他制御を行う。expectedVersion が現在の版と一致しない場合は
// 409 を返し、クライアント側で最新状態を読み直して再試行させる。
export async function onRequestPost(context) {
  try {
    const body = JSON.parse(await context.request.text());
    if (!Array.isArray(body.active) || !Array.isArray(body.results)) {
      return jsonResponse({ error: 'active / results must be arrays' }, 400);
    }

    const current = await readState(context.env.RACE_KV);

    if (!body.force && body.expectedVersion !== current.version) {
      return jsonResponse({ error: 'conflict', current }, 409);
    }

    const next = {
      version: current.version + 1,
      active: body.active,
      results: body.results
    };
    await context.env.RACE_KV.put(KV_KEY, JSON.stringify(next));
    return jsonResponse({ ok: true, version: next.version }, 200);
  } catch (err) {
    return jsonResponse({ error: String(err && err.message || err) }, 400);
  }
}
