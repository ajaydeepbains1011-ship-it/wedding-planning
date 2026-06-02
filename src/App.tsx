import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://fnluwlvosijscqlxwsqt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubHV3bHZvc2lqc2NxbHh3c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTg1MzIsImV4cCI6MjA5NTk3NDUzMn0.pOw_GNDrDud7hHFSotaY2ckFHvAbCfohVuNNr6LwTrE";
const BUCKET = "wedding-files";

// ─────────────────────────────────────────────────────────────────────────────
// GMAIL CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const GMAIL_CLIENT_ID = "834987931334-tse6juasd4p11dch5e7buop73q411b6d.apps.googleusercontent.com";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

function useGmail() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gmail_token"));
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function signIn() {
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: "token",
      scope: GMAIL_SCOPES,
      prompt: "consent",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function signOut() {
    localStorage.removeItem("gmail_token");
    setToken(null);
    setEmails([]);
  }

  // Handle OAuth redirect
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace("#", "?"));
    const t = hash.get("access_token");
    if (t) {
      localStorage.setItem("gmail_token", t);
      setToken(t);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function searchEmails(query: string) {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const searchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=15`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (searchRes.status === 401) { signOut(); return; }
      const searchData = await searchRes.json();
      if (!searchData.messages) { setEmails([]); setLoading(false); return; }
      const details = await Promise.all(
        searchData.messages.slice(0, 10).map(async (m: any) => {
          const r = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return r.json();
        })
      );
      setEmails(details.map((d: any) => {
        const headers = d.payload?.headers || [];
        const get = (name: string) => headers.find((h: any) => h.name === name)?.value || "";
        return { id: d.id, subject: get("Subject"), from: get("From"), date: get("Date"), snippet: d.snippet };
      }));
    } catch(e) { setError("Failed to load emails"); }
    setLoading(false);
  }

  return { token, signIn, signOut, searchEmails, emails, loading, error };
}

// Gmail Tab Component
function GmailTab({ vendors }: { vendors: any[] }) {
  const { token, signIn, signOut, searchEmails, emails, loading, error } = useGmail();
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");

  async function handleSearch() {
    const q = selectedVendor || search;
    if (!q) return;
    await searchEmails(q + " wedding");
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }); }
    catch { return dateStr; }
  }

  return (
    <div>
      {!token ? (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
          <h2 style={{ color:"#F5ECD7", fontWeight:400, marginBottom:8 }}>Connect your Gmail</h2>
          <p style={{ color:"#8A9DB0", fontSize:13, marginBottom:24, maxWidth:400, margin:"0 auto 24px" }}>
            Sign in with your joint Gmail to search vendor emails, view threads, and track all wedding communication in one place.
          </p>
          <button onClick={signIn} style={{
            background:"#F5ECD7", color:"#0F1923", border:"none", borderRadius:10,
            padding:"12px 28px", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit",
            display:"inline-flex", alignItems:"center", gap:10,
          }}>
            <span style={{ fontSize:18 }}>G</span> Sign in with Google
          </button>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:11, color:"#10B981" }}>✓ Connected to Gmail</div>
            <button onClick={signOut} style={{ background:"transparent", border:"1px solid #2A3A4A", color:"#8A9DB0", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
              Disconnect
            </button>
          </div>

          {/* Search */}
          <div style={{ background:"#141E2B", border:"1px solid #2A3A4A", borderRadius:12, padding:"16px 18px", marginBottom:18 }}>
            <div style={{ fontSize:11, color:"#B8860B", letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Search Vendor Emails</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
              <select value={selectedVendor} onChange={e=>{setSelectedVendor(e.target.value);setSearch("");}}
                style={{ background:"#0F1923", border:"1px solid #2A3A4A", color:"#C9A96E", borderRadius:8, padding:"7px 12px", fontSize:12, fontFamily:"inherit", flex:1, cursor:"pointer" }}>
                <option value="">— Pick a vendor —</option>
                {vendors.filter(v=>v.name!=="TBD"&&v.name!=="Booked").map(v=>(
                  <option key={v.id} value={v.name} style={{ background:"#0F1923" }}>{v.name} ({v.category})</option>
                ))}
              </select>
              <span style={{ color:"#4A5A6A", alignSelf:"center", fontSize:12 }}>or</span>
              <input placeholder="Type any search term…" value={search} onChange={e=>{setSearch(e.target.value);setSelectedVendor("");}}
                onKeyDown={e=>{ if(e.key==="Enter") handleSearch(); }}
                style={{ background:"#0F1923", border:"1px solid #2A3A4A", color:"#F5ECD7", borderRadius:8, padding:"7px 12px", fontSize:12, fontFamily:"inherit", flex:1, outline:"none" }}/>
              <button onClick={handleSearch} style={{ background:"#B8860B", color:"#0F1923", border:"none", borderRadius:8, padding:"7px 18px", cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:700 }}>
                {loading ? "Searching…" : "Search"}
              </button>
            </div>
            <div style={{ fontSize:10, color:"#4A5A6A" }}>Searches your joint Gmail inbox for matching emails</div>
          </div>

          {/* Results */}
          {error && <div style={{ color:"#EF4444", fontSize:12, marginBottom:12 }}>{error}</div>}
          {emails.length === 0 && !loading && (
            <div style={{ textAlign:"center", padding:"30px", color:"#2A3A4A", fontSize:13 }}>
              Pick a vendor or enter a search term above to find emails
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {emails.map(email => (
              <a key={email.id} href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`} target="_blank" rel="noreferrer"
                style={{ textDecoration:"none", display:"block", background:"#141E2B", border:"1px solid #1E2D3D", borderRadius:10, padding:"14px 18px", transition:"border-color 0.2s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#F5ECD7", flex:1 }}>{email.subject || "(no subject)"}</div>
                  <div style={{ fontSize:10, color:"#8A9DB0", whiteSpace:"nowrap", flexShrink:0 }}>{formatDate(email.date)}</div>
                </div>
                <div style={{ fontSize:11, color:"#B8860B", marginBottom:4 }}>{email.from}</div>
                <div style={{ fontSize:11, color:"#8A9DB0", lineHeight:1.5 }}>{email.snippet}</div>
                <div style={{ fontSize:10, color:"#2A3A4A", marginTop:6 }}>Click to open in Gmail →</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function uploadFile(file: File, path: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  } catch { return null; }
}

async function listFiles(folder: string): Promise<{name: string, url: string}[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: folder, limit: 100 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((f: any) => ({
      name: f.name,
      url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${folder}/${f.name}`,
    }));
  } catch { return []; }
}

async function deleteFile(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}` },
    });
    return res.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function VendorFiles({ vendorId, vendorName }: { vendorId: number | string, vendorName: string }) {
  const [files, setFiles] = useState<{name: string, url: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folder = `vendor-${vendorId}`;

  useEffect(() => {
    if (expanded) listFiles(folder).then(setFiles);
  }, [expanded, folder]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${folder}/${Date.now()}-${file.name}`;
    const url = await uploadFile(file, path);
    if (url) setFiles(prev => [...prev, { name: file.name, url }]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(file: {name: string, url: string}) {
    await deleteFile(`${folder}/${file.name}`);
    setFiles(prev => prev.filter(f => f.name !== file.name));
  }

  function fileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg","jpeg","png","gif","webp"].includes(ext||"")) return "🖼";
    if (ext === "pdf") return "📄";
    if (["doc","docx"].includes(ext||"")) return "📝";
    if (["xls","xlsx"].includes(ext||"")) return "📊";
    return "📎";
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setExpanded(v => !v)} style={{
        background: "none", border: "1px solid #2A3A4A", borderRadius: 6,
        color: "#8A9DB0", fontSize: 10, padding: "2px 8px", cursor: "pointer",
        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
      }}>
        📎 {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "Files"} {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div style={{ marginTop: 6, background: "#0F1923", border: "1px solid #1E2D3D", borderRadius: 8, padding: "8px 10px" }}>
          {files.length === 0 && !uploading && (
            <div style={{ fontSize: 10, color: "#4A5A6A", marginBottom: 6 }}>No files yet — upload contracts, quotes, inspiration</div>
          )}
          {files.map(f => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{fileIcon(f.name)}</span>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#B8860B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name.replace(/^\d+-/, "")}
              </a>
              <button onClick={() => handleDelete(f)} style={{ background: "none", border: "none", color: "#3A4A5A", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <input ref={inputRef} type="file" onChange={handleUpload} style={{ display: "none" }} id={`fu-${vendorId}`}/>
            <label htmlFor={`fu-${vendorId}`} style={{
              background: "#1A2535", border: "1px dashed #2A3A4A", borderRadius: 6,
              color: uploading ? "#4A5A6A" : "#8A9DB0", fontSize: 10, padding: "3px 10px",
              cursor: uploading ? "default" : "pointer",
            }}>
              {uploading ? "Uploading…" : "+ Upload file"}
            </label>
            <span style={{ fontSize: 9, color: "#4A5A6A" }}>PDF, image, doc — max 50MB</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_EVENTS = [
  { id:"haldi",     label:"Haldi / Vatna", emoji:"🌿", date:"2027-04-22", color:"#E8A020", stakes:"low"  },
  { id:"welcome",   label:"Welcome Party", emoji:"🎉", date:"2027-04-23", color:"#C0392B", stakes:"high" },
  { id:"sangeet",   label:"Sangeet",       emoji:"🎶", date:"2027-04-24", color:"#8E44AD", stakes:"high" },
  { id:"wedding",   label:"Wedding",       emoji:"🪷", date:"2027-04-25", color:"#1A7FC1", stakes:"high" },
  { id:"reception", label:"Reception",     emoji:"✨", date:"2027-04-26", color:"#1E8449", stakes:"high" },
];

// EUR/USD rate — editable in the UI
const DEFAULT_EUR_RATE = 1.09;

const DEFAULT_BUDGET = {
  haldi:     { total:15000,  items:[{name:"Florals & Turmeric Setup",cost:4000},{name:"Photographer",cost:3000},{name:"Catering (light)",cost:4000},{name:"Outfits",cost:2500},{name:"Misc",cost:1500}]},
  welcome:   { total:60000,  items:[{name:"Venue",cost:18000},{name:"Catering & Bar",cost:20000},{name:"DJ / Music",cost:7000},{name:"Décor & Lighting",cost:8000},{name:"Photography",cost:5000},{name:"Misc",cost:2000}]},
  sangeet:   { total:90000,  items:[{name:"Venue",cost:22000},{name:"Stage & AV",cost:12000},{name:"Choreographer",cost:8000},{name:"Catering & Bar",cost:25000},{name:"Décor & Lighting",cost:12000},{name:"Photography/Video",cost:8000},{name:"Dhol & Live Music",cost:5000},{name:"Misc",cost:3000}]},
  wedding:   { total:220000, items:[{name:"Venue",cost:55000},{name:"Catering",cost:55000},{name:"Mandap & Décor",cost:30000},{name:"Pandit",cost:5000},{name:"Photography/Video",cost:25000},{name:"Bridal HMU",cost:8000},{name:"Bridal Outfit",cost:15000},{name:"Groom Outfit",cost:8000},{name:"Transport & Logistics",cost:6000},{name:"Florals",cost:10000},{name:"Jewelry",cost:12000},{name:"Misc",cost:6000}]},
  reception: { total:115000, items:[{name:"Venue",cost:30000},{name:"Catering & Open Bar",cost:40000},{name:"Band / DJ",cost:15000},{name:"Décor & Lighting",cost:15000},{name:"Photography/Video",cost:10000},{name:"Cake",cost:3000},{name:"Misc",cost:2000}]},
};

// Payments: each entry has { id, description, amountEur, paidBy:"Ajay"|"Bianca", event, date, notes }
// The €10,000 deposit to wedding planner is the first real payment
const DEFAULT_PAYMENTS = [
  { id:"p1", description:"Wedding Planner Deposit", amountEur:10000, paidBy:"Ajay", event:"wedding", date:"2026-06-01", notes:"Initial deposit. Receipt on file." },
  { id:"p2", description:"Stylist Booking Fee",     amountEur:904.02, paidBy:"Ajay", event:"wedding", date:"2026-06-01", notes:"" },
];

const DEFAULT_VENDORS = [
  { id:1,  event:"all",       category:"Wedding Planner", name:"Booked",            contact:"", costEur:0,     depositEur:10000, status:"Deposit Paid", notes:"Full-service planner confirmed" },
  { id:2,  event:"all",       category:"Stylist",         name:"Booked",            contact:"", costEur:0,     depositEur:904.02,status:"Deposit Paid", notes:"Bridal stylist confirmed" },
  { id:3,  event:"wedding",   category:"Venue",           name:"Quinta de Santana", contact:"info@quintasantana.pt", costEur:50459, depositEur:0, status:"Inquired", notes:"" },
  { id:4,  event:"sangeet",   category:"Venue",           name:"Casa de Mateus",    contact:"", costEur:20183, depositEur:0, status:"Research", notes:"" },
  { id:5,  event:"welcome",   category:"Venue",           name:"Palácio de Belém",  contact:"", costEur:16514, depositEur:0, status:"Research", notes:"" },
  { id:6,  event:"reception", category:"Venue",           name:"TBD",               contact:"", costEur:27523, depositEur:0, status:"Research", notes:"Consider same estate as wedding" },
  { id:7,  event:"all",       category:"Photography",     name:"TBD",               contact:"", costEur:22936, depositEur:0, status:"Research", notes:"Need Punjabi wedding experience" },
  { id:8,  event:"all",       category:"Videography",     name:"TBD",               contact:"", costEur:13761, depositEur:0, status:"Research", notes:"Cinematic full-week coverage" },
  { id:9,  event:"wedding",   category:"Catering",        name:"TBD",               contact:"", costEur:50459, depositEur:0, status:"Research", notes:"Indian + Portuguese fusion" },
  { id:10, event:"sangeet",   category:"Choreographer",   name:"TBD",               contact:"", costEur:7339,  depositEur:0, status:"Research", notes:"" },
  { id:11, event:"wedding",   category:"Pandit",          name:"TBD",               contact:"", costEur:4587,  depositEur:0, status:"Research", notes:"Fly in from UK/Canada" },
  { id:12, event:"all",       category:"Florals",         name:"TBD",               contact:"", costEur:9174,  depositEur:0, status:"Research", notes:"Marigold sourcing in Portugal" },
  { id:13, event:"wedding",   category:"Bridal HMU",      name:"TBD",               contact:"", costEur:7339,  depositEur:0, status:"Research", notes:"Include trials" },
  { id:14, event:"sangeet",   category:"Dhol & Music",    name:"TBD",               contact:"", costEur:4587,  depositEur:0, status:"Research", notes:"" },
];

const DEFAULT_KANBAN = {
  todo: [
    { id:"k1",  title:"Book main wedding venue",               event:"wedding",   priority:"high", due:"2026-08" },
    { id:"k2",  title:"Book reception venue",                  event:"reception", priority:"high", due:"2026-09" },
    { id:"k3",  title:"Book sangeet venue",                    event:"sangeet",   priority:"high", due:"2026-09" },
    { id:"k4",  title:"Hire wedding photographer",             event:"all",       priority:"high", due:"2026-09" },
    { id:"k5",  title:"Hire videographer",                     event:"all",       priority:"high", due:"2026-09" },
    { id:"k6",  title:"Find & book Pandit",                    event:"wedding",   priority:"high", due:"2026-10" },
    { id:"k7",  title:"Finalize guest list",                   event:"all",       priority:"high", due:"2026-07" },
    { id:"k8",  title:"Allocate budget per event",             event:"all",       priority:"high", due:"2026-07" },
    { id:"k9",  title:"Research florists in Portugal",         event:"all",       priority:"med",  due:"2026-10" },
    { id:"k10", title:"Book bridal HMU artist",                event:"wedding",   priority:"high", due:"2026-10" },
    { id:"k11", title:"Book sangeet choreographer",            event:"sangeet",   priority:"med",  due:"2026-11" },
    { id:"k12", title:"Design & send save the dates",          event:"all",       priority:"high", due:"2026-09" },
    { id:"k13", title:"Book hotel room block for guests",      event:"all",       priority:"high", due:"2026-10" },
    { id:"k14", title:"Book flights to Portugal",              event:"all",       priority:"med",  due:"2026-08" },
    { id:"k15", title:"Research caterers (Indian fusion)",     event:"wedding",   priority:"high", due:"2026-10" },
    { id:"k16", title:"Apply for marriage license (Portugal)", event:"wedding",   priority:"high", due:"2026-12" },
    { id:"k17", title:"Design wedding website",                event:"all",       priority:"med",  due:"2026-09" },
    { id:"k18", title:"Order bridal lehenga",                  event:"wedding",   priority:"high", due:"2026-10" },
    { id:"k19", title:"Order groom sherwani",                  event:"wedding",   priority:"high", due:"2026-10" },
    { id:"k20", title:"Haldi setup plan",                      event:"haldi",     priority:"low",  due:"2027-01" },
    { id:"k21", title:"Welcome party DJ",                      event:"welcome",   priority:"med",  due:"2026-11" },
    { id:"k22", title:"Reception band / DJ",                   event:"reception", priority:"med",  due:"2026-11" },
    { id:"k23", title:"Design invitation suite",               event:"all",       priority:"med",  due:"2026-11" },
    { id:"k24", title:"Mandap design & florals plan",          event:"wedding",   priority:"high", due:"2026-12" },
    { id:"k25", title:"Reception venue booking",               event:"reception", priority:"high", due:"2026-09" },
  ],
  inprogress: [],
  done: [
    { id:"kd1", title:"Hire local Portugal wedding coordinator", event:"all",     priority:"high", due:"2026-08" },
    { id:"kd2", title:"Book bridal stylist",                     event:"wedding", priority:"high", due:"2026-10" },
  ],
};

const DEFAULT_CHECKLIST = [
  { category:"Legal & Admin", items:[
    {id:"c1", text:"Confirm legal requirements for foreign marriage in Portugal", done:false},
    {id:"c2", text:"Obtain apostilled birth certificates", done:false},
    {id:"c3", text:"Hire local Portuguese wedding coordinator", done:true},
    {id:"c4", text:"Consult immigration/legal for NRI family guests", done:false},
    {id:"c5", text:"Get marriage legally registered", done:false},
    {id:"c6", text:"Apply for Portuguese marriage license (6+ months ahead)", done:false},
  ]},
  { category:"Venues", items:[
    {id:"c10", text:"Shortlist & visit wedding venues in Portugal", done:false},
    {id:"c11", text:"Confirm catering exclusivity rules at each venue", done:false},
    {id:"c12", text:"Confirm space for mandap/pheras setup", done:false},
    {id:"c13", text:"Book all 5 event venues", done:false},
    {id:"c14", text:"Arrange hotel room block for guests near venues", done:false},
    {id:"c15", text:"Confirm AV/stage capabilities for sangeet venue", done:false},
  ]},
  { category:"Vendors (Core)", items:[
    {id:"c20", text:"Wedding planner booked ✓", done:true},
    {id:"c21", text:"Bridal stylist booked ✓", done:true},
    {id:"c22", text:"Photographer booked & contract signed", done:false},
    {id:"c23", text:"Videographer booked & contract signed", done:false},
    {id:"c24", text:"Pandit confirmed for wedding ceremony", done:false},
    {id:"c25", text:"Bridal HMU artist booked (trial scheduled)", done:false},
    {id:"c26", text:"Florist contract signed", done:false},
    {id:"c27", text:"Caterer booked for wedding & reception", done:false},
    {id:"c28", text:"Sangeet choreographer hired", done:false},
    {id:"c29", text:"Band/DJ booked for all events", done:false},
    {id:"c30", text:"Dhol player booked for sangeet & baraat", done:false},
  ]},
  { category:"Outfits & Beauty", items:[
    {id:"c40", text:"Bridal lehenga ordered (6–8 month lead time)", done:false},
    {id:"c41", text:"Groom sherwani ordered", done:false},
    {id:"c42", text:"Sangeet & reception outfits selected", done:false},
    {id:"c43", text:"Jewelry sourced/reserved", done:false},
    {id:"c44", text:"HMU trials done (3–4 months before wedding)", done:false},
    {id:"c45", text:"Dupatta & accessories finalized", done:false},
  ]},
  { category:"Guest Management", items:[
    {id:"c50", text:"Final guest list confirmed", done:false},
    {id:"c51", text:"Save the dates sent (18 months out)", done:false},
    {id:"c52", text:"Formal invitations sent (6 months out)", done:false},
    {id:"c53", text:"RSVP tracking set up", done:false},
    {id:"c54", text:"Guest transport from hotel to venues arranged", done:false},
    {id:"c55", text:"Welcome bags for out-of-town guests prepared", done:false},
    {id:"c56", text:"Dietary restrictions collected", done:false},
    {id:"c57", text:"Seating charts done for all events", done:false},
  ]},
  { category:"Ceremony Details", items:[
    {id:"c60", text:"Confirm all rituals with Pandit (Anand Karaj or pheras)", done:false},
    {id:"c61", text:"Mandap design finalized", done:false},
    {id:"c62", text:"Doli/baraat plan finalized", done:false},
    {id:"c63", text:"Wedding program/order of service designed", done:false},
    {id:"c64", text:"Milni ceremony logistics planned", done:false},
    {id:"c65", text:"Chooda & kalire ceremony planned", done:false},
  ]},
  { category:"Sangeet", items:[
    {id:"c70", text:"Sangeet program/running order planned", done:false},
    {id:"c71", text:"Family & friends performances coordinated", done:false},
    {id:"c72", text:"Stage and AV setup confirmed with venue", done:false},
    {id:"c73", text:"Dhol player confirmed for sangeet", done:false},
    {id:"c74", text:"Sangeet emcee confirmed", done:false},
  ]},
  { category:"Haldi / Vatna", items:[
    {id:"c80", text:"Haldi venue/home setup confirmed", done:false},
    {id:"c81", text:"Ubtan ingredients sourced", done:false},
    {id:"c82", text:"Yellow & floral décor plan ready", done:false},
    {id:"c83", text:"Light catering / snacks arranged", done:false},
    {id:"c84", text:"Photographer for haldi confirmed", done:false},
  ]},
  { category:"Portugal Logistics", items:[
    {id:"c90", text:"Group flights coordinated or communicated", done:false},
    {id:"c91", text:"Airport transfers arranged for wedding party", done:false},
    {id:"c92", text:"Day-of transport between all venues", done:false},
    {id:"c93", text:"Welcome itinerary/guide for guests prepared", done:false},
    {id:"c94", text:"Emergency kit packed (safety pins, stain remover, etc.)", done:false},
    {id:"c95", text:"Weather contingency plan for outdoor elements", done:false},
  ]},
  { category:"Day-Of Coordination", items:[
    {id:"c100", text:"Minute-by-minute timeline for each event day finalized", done:false},
    {id:"c101", text:"Emergency contact list distributed to all vendors", done:false},
    {id:"c102", text:"Final vendor payments scheduled", done:false},
    {id:"c103", text:"All vendor gratuities prepared", done:false},
  ]},
];

const STATUS_COLORS  = { "Research":"#94a3b8","Inquired":"#F59E0B","Booked":"#10B981","Deposit Paid":"#3B82F6","Paid in Full":"#6366F1","Cancelled":"#EF4444" };
const PRIORITY_COLORS= { high:"#EF4444", med:"#F59E0B", low:"#10B981" };
const RSVP_COLORS    = { "Confirmed":"#10B981","Pending":"#F59E0B","Declined":"#EF4444","Not Sent":"#94a3b8" };
const SIDE_COLORS    = { "Bride":"#8E44AD","Groom":"#1A7FC1","Both":"#B8860B" };
const AUTHOR_COLORS  = { "Ajay":"#1A7FC1","Bianca":"#8E44AD","Kamal":"#E8A020","Anit":"#C0392B" };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function daysUntil(d) {
  const t=new Date(d), today=new Date(); today.setHours(0,0,0,0);
  return Math.ceil((t-today)/86400000);
}
function fmtUSD(n) { return `$${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtEUR(n) { return `€${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function uid()     { return "u"+Math.random().toString(36).slice(2,9); }
function eurToUsd(eur, rate) { return eur * rate; }

async function sharedSave(key,val) { try{ await window.storage.set(key,JSON.stringify(val),true); }catch(e){} }
async function sharedLoad(key,fallback) { try{ const r=await window.storage.get(key,true); return r?JSON.parse(r.value):fallback; }catch(e){ return fallback; } }

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
export default function WeddingPlanner() {
  const [ready,setReady]       = useState(false);
  const [tab,setTab]           = useState("overview");
  const [userName,setUserName] = useState("");
  const [nameInput,setNameInput]= useState("");

  // Core data
  const [events,setEvents]       = useState(DEFAULT_EVENTS);
  const [budget,setBudget]       = useState(DEFAULT_BUDGET);
  const [vendors,setVendors]     = useState(DEFAULT_VENDORS);
  const [payments,setPayments]   = useState(DEFAULT_PAYMENTS);
  const [kanban,setKanban]       = useState(DEFAULT_KANBAN);
  const [checklist,setChecklist] = useState(DEFAULT_CHECKLIST);
  const [guests,setGuests]       = useState([]);
  const [notes,setNotes]         = useState([]);
  const [eurRate,setEurRate]     = useState(DEFAULT_EUR_RATE);

  // UI state
  const [budgetEvent,setBudgetEvent]   = useState("wedding");
  const [dragCard,setDragCard]         = useState(null);
  const [dragFrom,setDragFrom]         = useState(null);
  const [showNewCard,setShowNewCard]   = useState(null);
  const [newCard,setNewCard]           = useState({title:"",event:"wedding",priority:"med",due:""});
  const [editingCard,setEditingCard]   = useState(null);
  const [newCheckItem,setNewCheckItem] = useState({});
  const [editingCheck,setEditingCheck] = useState(null);
  const [editCheckText,setEditCheckText]= useState("");
  const [newNote,setNewNote]           = useState("");
  const [guestFilter,setGuestFilter]   = useState("all");
  const [guestSearch,setGuestSearch]   = useState("");
  const [showAddGuest,setShowAddGuest] = useState(false);
  const [newGuest,setNewGuest]         = useState({name:"",side:"Bride",table:"",dietary:"",rsvp:"Not Sent",events:[],notes:""});
  const [guestSort,setGuestSort]       = useState("name");
  const [showAddPayment,setShowAddPayment]= useState(false);
  const [newPayment,setNewPayment]     = useState({description:"",amountEur:"",paidBy:"Ajay",event:"wedding",date:new Date().toISOString().slice(0,10),notes:""});
  const [editingDate,setEditingDate]   = useState(null); // event id being edited

  const firstRender = useRef(true);
  const syncTimer   = useRef(null);

  // ── Load ──
  useEffect(()=>{
    (async()=>{
      const storedName=localStorage.getItem("wp_username")||"";
      setUserName(storedName);
      const [ev,b,v,py,k,c,g,n,r]=await Promise.all([
        sharedLoad("wp_events",   DEFAULT_EVENTS),
        sharedLoad("wp_budget",   DEFAULT_BUDGET),
        sharedLoad("wp_vendors",  DEFAULT_VENDORS),
        sharedLoad("wp_payments", DEFAULT_PAYMENTS),
        sharedLoad("wp_kanban",   DEFAULT_KANBAN),
        sharedLoad("wp_checklist",DEFAULT_CHECKLIST),
        sharedLoad("wp_guests",   []),
        sharedLoad("wp_notes",    []),
        sharedLoad("wp_eurrate",  DEFAULT_EUR_RATE),
      ]);
      setEvents(ev); setBudget(b); setVendors(v); setPayments(py);
      setKanban(k); setChecklist(c); setGuests(g); setNotes(n); setEurRate(r);
      setReady(true);
    })();
  },[]);

  // ── Poll every 15s ──
  useEffect(()=>{
    if(!ready)return;
    const iv=setInterval(async()=>{
      const [ev,b,v,py,k,c,g,n,r]=await Promise.all([
        sharedLoad("wp_events",null),sharedLoad("wp_budget",null),sharedLoad("wp_vendors",null),
        sharedLoad("wp_payments",null),sharedLoad("wp_kanban",null),sharedLoad("wp_checklist",null),
        sharedLoad("wp_guests",null),sharedLoad("wp_notes",null),sharedLoad("wp_eurrate",null),
      ]);
      if(ev)setEvents(ev); if(b)setBudget(b); if(v)setVendors(v); if(py)setPayments(py);
      if(k)setKanban(k); if(c)setChecklist(c); if(g)setGuests(g); if(n)setNotes(n); if(r)setEurRate(r);
    },15000);
    return()=>clearInterval(iv);
  },[ready]);

  // ── Auto-save ──
  useEffect(()=>{
    if(!ready)return;
    if(firstRender.current){firstRender.current=false;return;}
    clearTimeout(syncTimer.current);
    syncTimer.current=setTimeout(()=>{
      sharedSave("wp_events",events); sharedSave("wp_budget",budget); sharedSave("wp_vendors",vendors);
      sharedSave("wp_payments",payments); sharedSave("wp_kanban",kanban); sharedSave("wp_checklist",checklist);
      sharedSave("wp_guests",guests); sharedSave("wp_notes",notes); sharedSave("wp_eurrate",eurRate);
    },800);
  },[events,budget,vendors,payments,kanban,checklist,guests,notes,eurRate,ready]);

  // ── Event dates ──
  function updateEventDate(id,date){ setEvents(p=>p.map(e=>e.id===id?{...e,date}:e)); }

  // ── Kanban ──
  function onDragStart(card,col){setDragCard(card);setDragFrom(col);}
  function onDrop(col){
    if(!dragCard||dragFrom===col)return;
    setKanban(p=>({...p,[dragFrom]:p[dragFrom].filter(c=>c.id!==dragCard.id),[col]:[...p[col],dragCard]}));
    setDragCard(null);setDragFrom(null);
  }
  function deleteCard(col,id){setKanban(p=>({...p,[col]:p[col].filter(c=>c.id!==id)}));}
  function addCard(col){
    if(!newCard.title.trim())return;
    setKanban(p=>({...p,[col]:[...p[col],{id:uid(),...newCard,due:newCard.due||"TBD"}]}));
    setNewCard({title:"",event:"wedding",priority:"med",due:""});setShowNewCard(null);
  }
  function updateCardTitle(col,id,title){setKanban(p=>({...p,[col]:p[col].map(c=>c.id===id?{...c,title}:c)}));}

  // ── Checklist ──
  function toggleCheck(ci,ii){setChecklist(p=>p.map((c,i)=>i!==ci?c:{...c,items:c.items.map((it,j)=>j!==ii?it:{...it,done:!it.done})}));}
  function addCheckItem(ci){const txt=(newCheckItem[ci]||"").trim();if(!txt)return;setChecklist(p=>p.map((c,i)=>i!==ci?c:{...c,items:[...c.items,{id:uid(),text:txt,done:false}]}));setNewCheckItem(n=>({...n,[ci]:""}));}
  function deleteCheckItem(ci,ii){setChecklist(p=>p.map((c,i)=>i!==ci?c:{...c,items:c.items.filter((_,j)=>j!==ii)}));}
  function saveCheckEdit(ci,ii){if(!editCheckText.trim())return;setChecklist(p=>p.map((c,i)=>i!==ci?c:{...c,items:c.items.map((it,j)=>j!==ii?it:{...it,text:editCheckText})}));setEditingCheck(null);}

  // ── Budget ──
  function updateBudgetTotal(evId,val){setBudget(p=>({...p,[evId]:{...p[evId],total:Number(val)||0}}));}
  function updateItemCost(evId,name,val){setBudget(p=>({...p,[evId]:{...p[evId],items:p[evId].items.map(it=>it.name===name?{...it,cost:Number(val)||0}:it)}}));}
  function updateItemName(evId,old,nw){setBudget(p=>({...p,[evId]:{...p[evId],items:p[evId].items.map(it=>it.name===old?{...it,name:nw}:it)}}));}
  function addBudgetItem(evId){setBudget(p=>({...p,[evId]:{...p[evId],items:[...p[evId].items,{name:"New Item "+uid(),cost:0}]}}));}
  function deleteBudgetItem(evId,name){setBudget(p=>({...p,[evId]:{...p[evId],items:p[evId].items.filter(it=>it.name!==name)}}));}

  // ── Vendors ──
  function updateVendor(id,field,val){setVendors(p=>p.map(v=>v.id===id?{...v,[field]:["costEur","depositEur"].includes(field)?Number(val)||0:val}:v));}
  function addVendor(){setVendors(p=>[...p,{id:Date.now(),event:"wedding",category:"",name:"New Vendor",contact:"",costEur:0,depositEur:0,status:"Research",notes:""}]);}
  function deleteVendor(id){setVendors(p=>p.filter(v=>v.id!==id));}

  // ── Payments ──
  function addPayment(){
    if(!newPayment.description.trim()||!newPayment.amountEur)return;
    setPayments(p=>[...p,{id:uid(),...newPayment,amountEur:Number(newPayment.amountEur)}]);
    setNewPayment({description:"",amountEur:"",paidBy:"Ajay",event:"wedding",date:new Date().toISOString().slice(0,10),notes:""});
    setShowAddPayment(false);
  }
  function deletePayment(id){setPayments(p=>p.filter(x=>x.id!==id));}

  // ── Guests ──
  function addGuest(){if(!newGuest.name.trim())return;setGuests(p=>[...p,{id:uid(),...newGuest}]);setNewGuest({name:"",side:"Bride",table:"",dietary:"",rsvp:"Not Sent",events:[],notes:""});setShowAddGuest(false);}
  function updateGuest(id,field,val){setGuests(p=>p.map(g=>g.id===id?{...g,[field]:val}:g));}
  function deleteGuest(id){setGuests(p=>p.filter(g=>g.id!==id));}
  function toggleGuestEvent(id,evId){setGuests(p=>p.map(g=>g.id!==id?g:{...g,events:g.events.includes(evId)?g.events.filter(e=>e!==evId):[...g.events,evId]}));}

  // ── Notes ──
  function addNote(){if(!newNote.trim())return;setNotes(p=>[{id:uid(),text:newNote,author:userName||"Anonymous",ts:new Date().toISOString()},...p]);setNewNote("");}
  function deleteNote(id){setNotes(p=>p.filter(n=>n.id!==id));}

  // ── Derived ──
  const totalBudgetAll  = Object.values(budget).reduce((s,e)=>s+e.total,0);
  const totalPaidEur    = payments.reduce((s,p)=>s+p.amountEur,0);
  const totalPaidUsd    = eurToUsd(totalPaidEur,eurRate);
  const ajayPaidEur     = payments.filter(p=>p.paidBy==="Ajay").reduce((s,p)=>s+p.amountEur,0);
  const biancaPaidEur   = payments.filter(p=>p.paidBy==="Bianca").reduce((s,p)=>s+p.amountEur,0);
  const checkDone       = checklist.reduce((s,c)=>s+c.items.filter(i=>i.done).length,0);
  const checkTotal      = checklist.reduce((s,c)=>s+c.items.length,0);
  const tasksLeft       = kanban.todo.length+kanban.inprogress.length;
  const filteredGuests  = guests
    .filter(g=>guestFilter==="all"||g.rsvp===guestFilter||g.side===guestFilter)
    .filter(g=>!guestSearch||g.name.toLowerCase().includes(guestSearch.toLowerCase()))
    .sort((a,b)=>guestSort==="name"?a.name.localeCompare(b.name):guestSort==="table"?(a.table||"zzz").localeCompare(b.table||"zzz"):a.rsvp.localeCompare(b.rsvp));

  const TABS=[
    {id:"overview",label:"Overview"},{id:"budget",label:"Budget"},{id:"payments",label:"Payments"},
    {id:"vendors",label:"Vendors"},{id:"kanban",label:"Kanban"},{id:"checklist",label:"Checklist"},
    {id:"guests",label:`Guests (${guests.length})`},{id:"notes",label:`Notes (${notes.length})`},
    {id:"gmail",label:"📧 Gmail"},
  ];
  const inp=(extra={})=>({background:"transparent",border:"none",color:"#F5ECD7",fontSize:13,fontFamily:"Palatino,serif",outline:"none",width:"100%",...extra});
  const card=(extra={})=>({background:"linear-gradient(145deg,#1C2A3A,#0F1923)",border:"1px solid #2A3A4A",borderRadius:12,padding:"16px 18px",...extra});

  // ── Name gate ──
  if(!userName) return(
    <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Palatino,serif"}}>
      <div style={{background:"linear-gradient(145deg,#1C2A3A,#0F1923)",border:"1px solid #B8860B",borderRadius:16,padding:"40px 48px",textAlign:"center",maxWidth:380}}>
        <div style={{fontSize:36,marginBottom:12}}>🪷</div>
        <h2 style={{color:"#F5ECD7",fontWeight:400,margin:"0 0 6px",fontSize:22}}>Welcome</h2>
        <p style={{color:"#8A9DB0",fontSize:13,margin:"0 0 24px"}}>Who are you? This helps us attribute notes and payments.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginBottom:20}}>
          {["Ajay","Bianca","Kamal","Anit"].map(n=>(
            <button key={n} onClick={()=>{setUserName(n);localStorage.setItem("wp_username",n);}}
              style={{background:"#1A2535",border:`2px solid ${AUTHOR_COLORS[n]}`,color:AUTHOR_COLORS[n],borderRadius:8,padding:"10px 20px",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700}}>
              {n}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Or type your name…" value={nameInput} onChange={e=>setNameInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&nameInput.trim()){setUserName(nameInput.trim());localStorage.setItem("wp_username",nameInput.trim());}}}
            style={{...inp(),background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:8,padding:"8px 12px",flex:1,fontSize:13}}/>
          <button onClick={()=>{if(nameInput.trim()){setUserName(nameInput.trim());localStorage.setItem("wp_username",nameInput.trim());}}}
            style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13}}>Go</button>
        </div>
      </div>
    </div>
  );

  if(!ready) return(
    <div style={{minHeight:"100vh",background:"#0F1923",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#B8860B",fontFamily:"Palatino,serif",fontSize:18}}>Loading…</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#0F1923",fontFamily:"'Palatino Linotype',Palatino,Georgia,serif",color:"#F5ECD7"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1A0A00 0%,#2D1200 40%,#0D1F3C 100%)",borderBottom:"2px solid #B8860B",padding:"20px 24px 0"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:10,letterSpacing:4,color:"#B8860B",textTransform:"uppercase",marginBottom:3}}>Portugal Wedding</div>
            <h1 style={{margin:0,fontSize:"clamp(18px,3.5vw,28px)",fontWeight:400,color:"#F5ECD7",letterSpacing:1}}>🪷 Ajay & Bianca</h1>
            <div style={{fontSize:11,color:"#C9A96E",marginTop:2}}>5 Events · $500,000 Budget · {fmtEUR(totalPaidEur)} paid so far</div>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingBottom:4,alignItems:"center"}}>
            {events.map(e=>(
              <div key={e.id} style={{textAlign:"center"}}>
                <div style={{fontSize:14}}>{e.emoji}</div>
                <div style={{fontSize:9,color:"#B8860B",textTransform:"uppercase",letterSpacing:1}}>{e.label.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#F5ECD7"}}>{daysUntil(e.date)}d</div>
              </div>
            ))}
            <div style={{fontSize:11,color:"#8A9DB0",borderLeft:"1px solid #2A3A4A",paddingLeft:12}}>
              👤 <span style={{color:AUTHOR_COLORS[userName]||"#C9A96E"}}>{userName}</span>
              <button onClick={()=>{setUserName("");localStorage.removeItem("wp_username");}} style={{background:"none",border:"none",color:"#3A4A5A",cursor:"pointer",fontSize:10,marginLeft:4}}>switch</button>
            </div>
          </div>
        </div>
        {/* EUR rate bar */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:10,color:"#8A9DB0"}}>
          <span>EUR/USD rate:</span>
          <input type="number" step="0.01" value={eurRate}
            onChange={e=>setEurRate(Number(e.target.value)||1.09)}
            style={{...inp(),width:60,fontSize:11,color:"#B8860B",borderBottom:"1px solid #B8860B44"}}/>
          <span style={{color:"#4A5A6A"}}>· Update this anytime to reflect the current exchange rate</span>
        </div>
        <div style={{display:"flex",gap:0,marginTop:12,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:tab===t.id?"#B8860B":"transparent",color:tab===t.id?"#0F1923":"#C9A96E",
              border:"none",padding:"8px 14px",cursor:"pointer",fontSize:11,fontFamily:"inherit",
              fontWeight:tab===t.id?700:400,whiteSpace:"nowrap",
              borderTop:tab===t.id?"2px solid #B8860B":"2px solid transparent",transition:"all 0.2s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"22px 20px 60px",maxWidth:1200,margin:"0 auto"}}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview" && (
          <div>
            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
              {[
                {label:"Total Budget",    value:"$500,000",                           sub:"overall target"},
                {label:"Total Paid (€)",  value:fmtEUR(totalPaidEur),                col:"#F59E0B",sub:fmtUSD(totalPaidUsd)+" USD"},
                {label:"Ajay's Family",   value:fmtEUR(ajayPaidEur),                 col:"#1A7FC1",sub:fmtUSD(eurToUsd(ajayPaidEur,eurRate))+" USD"},
                {label:"Bianca's Family", value:fmtEUR(biancaPaidEur),               col:"#8E44AD",sub:fmtUSD(eurToUsd(biancaPaidEur,eurRate))+" USD"},
                {label:"Tasks Left",      value:tasksLeft,                             sub:"kanban items"},
                {label:"Checklist",       value:`${checkDone}/${checkTotal}`,          sub:"items done"},
              ].map(c=>(
                <div key={c.label} style={{...card(),padding:"14px 16px"}}>
                  <div style={{fontSize:9,letterSpacing:2,color:"#B8860B",textTransform:"uppercase"}}>{c.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:c.col||"#F5ECD7",margin:"5px 0 2px"}}>{c.value}</div>
                  <div style={{fontSize:10,color:"#8A9DB0"}}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Budget bar */}
            <div style={{...card(),marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,color:"#B8860B",letterSpacing:1,textTransform:"uppercase"}}>Budget Allocation vs $500K</span>
                <span style={{fontSize:11,color:totalBudgetAll>500000?"#EF4444":"#10B981"}}>${totalBudgetAll.toLocaleString()} / $500,000</span>
              </div>
              <div style={{display:"flex",height:12,borderRadius:99,overflow:"hidden",gap:2}}>
                {events.map(ev=>{const pct=(budget[ev.id].total/500000)*100;return<div key={ev.id} title={`${ev.label}: $${budget[ev.id].total.toLocaleString()}`} style={{width:`${pct}%`,background:ev.color,minWidth:pct>0?2:0}}/>;  })}
              </div>
              <div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap"}}>
                {events.map(ev=>(
                  <div key={ev.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:ev.color}}/>
                    <span style={{color:"#C9A96E"}}>{ev.emoji} {ev.label}</span>
                    <span style={{color:"#F5ECD7",fontWeight:700}}>${budget[ev.id].total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Event timeline with editable dates */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"18px 0 10px"}}>
              <h2 style={{fontSize:11,letterSpacing:3,color:"#B8860B",textTransform:"uppercase",margin:0,fontWeight:400}}>Event Timeline</h2>
              <span style={{fontSize:10,color:"#4A5A6A"}}>Click a date to edit</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {events.map((ev,i)=>(
                <div key={ev.id} style={{display:"grid",gridTemplateColumns:"auto 1fr auto",alignItems:"center",gap:16,background:"linear-gradient(90deg,#1C2A3A,#141E2B)",border:`1px solid ${ev.color}44`,borderLeft:`4px solid ${ev.color}`,borderRadius:10,padding:"12px 16px"}}>
                  <div style={{textAlign:"center",minWidth:40}}>
                    <div style={{fontSize:20}}>{ev.emoji}</div>
                    <div style={{fontSize:9,color:ev.color,fontWeight:700}}>Day {i+1}</div>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"#F5ECD7"}}>{ev.label}</div>
                    <div style={{fontSize:10,color:"#8A9DB0",marginTop:3,display:"flex",alignItems:"center",gap:6}}>
                      {editingDate===ev.id ? (
                        <input type="date" value={ev.date}
                          onChange={e=>updateEventDate(ev.id,e.target.value)}
                          onBlur={()=>setEditingDate(null)}
                          autoFocus
                          style={{...inp(),width:140,fontSize:11,color:"#B8860B",background:"#1A2535",border:"1px solid #B8860B",borderRadius:6,padding:"2px 6px"}}/>
                      ):(
                        <span onClick={()=>setEditingDate(ev.id)} style={{cursor:"pointer",borderBottom:"1px dashed #3A4A5A",paddingBottom:1}}>
                          {new Date(ev.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
                        </span>
                      )}
                      {ev.stakes==="low"&&<span style={{background:"#1A3A1A",color:"#4CAF50",fontSize:9,padding:"1px 7px",borderRadius:99}}>Lower key</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:700,color:ev.color}}>${budget[ev.id].total.toLocaleString()}</div>
                    <div style={{fontSize:10,color:"#8A9DB0"}}>{daysUntil(ev.date)} days away</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PAYMENTS ══ */}
        {tab==="payments" && (
          <div>
            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
              {[
                {label:"Total Paid (EUR)",  val:fmtEUR(totalPaidEur),              col:"#F59E0B"},
                {label:"Total Paid (USD)",  val:fmtUSD(totalPaidUsd),              col:"#F5ECD7"},
                {label:"Ajay's Family",     val:fmtEUR(ajayPaidEur),               col:"#1A7FC1", sub:fmtUSD(eurToUsd(ajayPaidEur,eurRate))},
                {label:"Bianca's Family",   val:fmtEUR(biancaPaidEur),             col:"#8E44AD", sub:fmtUSD(eurToUsd(biancaPaidEur,eurRate))},
                {label:"Budget Remaining",  val:"$"+((500000-totalPaidUsd)|0).toLocaleString(), col: totalPaidUsd>500000?"#EF4444":"#10B981"},
              ].map(s=>(
                <div key={s.label} style={{...card(),padding:"12px 16px"}}>
                  <div style={{fontSize:9,color:"#8A9DB0",letterSpacing:1,textTransform:"uppercase"}}>{s.label}</div>
                  <div style={{fontSize:20,fontWeight:700,color:s.col||"#F5ECD7",marginTop:3}}>{s.val}</div>
                  {s.sub&&<div style={{fontSize:10,color:"#8A9DB0",marginTop:2}}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Rate reminder */}
            <div style={{background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:9,padding:"10px 16px",marginBottom:16,fontSize:11,color:"#8A9DB0"}}>
              💱 All amounts entered in <strong style={{color:"#B8860B"}}>Euros (€)</strong>. Converted to USD at <strong style={{color:"#B8860B"}}>1 EUR = ${eurRate} USD</strong>. Update the rate in the header bar anytime.
            </div>

            {/* Add payment */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h2 style={{margin:0,fontSize:11,letterSpacing:3,color:"#B8860B",textTransform:"uppercase",fontWeight:400}}>Payment Log</h2>
              <button onClick={()=>setShowAddPayment(v=>!v)} style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>+ Log Payment</button>
            </div>

            {showAddPayment&&(
              <div style={{...card(),border:"1px solid #B8860B",marginBottom:16}}>
                <div style={{fontSize:11,color:"#B8860B",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>New Payment</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:12}}>
                  {[
                    {label:"DESCRIPTION *",field:"description",placeholder:"e.g. Venue deposit",type:"text"},
                    {label:"AMOUNT (€) *",  field:"amountEur",  placeholder:"e.g. 5000",       type:"number"},
                    {label:"DATE",          field:"date",        placeholder:"",                type:"date"},
                    {label:"NOTES",         field:"notes",       placeholder:"Any notes",       type:"text"},
                  ].map(f=>(
                    <div key={f.field}>
                      <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>{f.label}</div>
                      <input type={f.type} value={newPayment[f.field]} placeholder={f.placeholder}
                        onChange={e=>setNewPayment(p=>({...p,[f.field]:e.target.value}))}
                        style={{...inp(),background:"#0F1923",border:"1px solid #2A3A4A",borderRadius:6,padding:"6px 10px",fontSize:12}}/>
                    </div>
                  ))}
                  <div>
                    <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>PAID BY</div>
                    <select value={newPayment.paidBy} onChange={e=>setNewPayment(p=>({...p,paidBy:e.target.value}))}
                      style={{background:"#0F1923",border:"1px solid #2A3A4A",color:AUTHOR_COLORS[newPayment.paidBy]||"#C9A96E",borderRadius:6,padding:"6px 10px",fontSize:12,fontFamily:"inherit",width:"100%",cursor:"pointer"}}>
                      {["Ajay","Bianca","Kamal","Anit"].map(n=><option key={n} value={n} style={{background:"#0F1923",color:AUTHOR_COLORS[n]}}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>EVENT</div>
                    <select value={newPayment.event} onChange={e=>setNewPayment(p=>({...p,event:e.target.value}))}
                      style={{background:"#0F1923",border:"1px solid #2A3A4A",color:"#C9A96E",borderRadius:6,padding:"6px 10px",fontSize:12,fontFamily:"inherit",width:"100%",cursor:"pointer"}}>
                      {[...events.map(e=>({id:e.id,label:e.label})),{id:"all",label:"All Events"}].map(e=><option key={e.id} value={e.id} style={{background:"#0F1923"}}>{e.label}</option>)}
                    </select>
                  </div>
                </div>
                {newPayment.amountEur&&(
                  <div style={{background:"#0F1923",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#8A9DB0"}}>
                    Preview: <strong style={{color:"#B8860B"}}>{fmtEUR(Number(newPayment.amountEur))}</strong> = <strong style={{color:"#10B981"}}>{fmtUSD(eurToUsd(Number(newPayment.amountEur),eurRate))}</strong> at current rate
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addPayment} style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:7,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>Log Payment</button>
                  <button onClick={()=>setShowAddPayment(false)} style={{background:"transparent",color:"#8A9DB0",border:"1px solid #2A3A4A",borderRadius:7,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancel</button>
                </div>
              </div>
            )}

            {/* Payment list */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {payments.map(p=>{
                const usd=eurToUsd(p.amountEur,eurRate);
                const ev=events.find(e=>e.id===p.event)||{color:"#888",emoji:"📌",label:"All Events"};
                const authorCol=AUTHOR_COLORS[p.paidBy]||"#B8860B";
                return(
                  <div key={p.id} style={{background:"#141E2B",border:`1px solid #1E2D3D`,borderLeft:`4px solid ${authorCol}`,borderRadius:10,padding:"14px 18px",position:"relative"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"start"}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#F5ECD7",marginBottom:4}}>{p.description}</div>
                        <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11}}>
                          <span style={{color:authorCol,fontWeight:700}}>👤 {p.paidBy}</span>
                          <span style={{color:ev.color}}>{ev.emoji} {ev.label}</span>
                          <span style={{color:"#8A9DB0"}}>📅 {p.date}</span>
                          {p.notes&&<span style={{color:"#8A9DB0"}}>💬 {p.notes}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:20,fontWeight:700,color:"#F59E0B"}}>{fmtEUR(p.amountEur)}</div>
                        <div style={{fontSize:11,color:"#10B981",marginTop:2}}>{fmtUSD(usd)}</div>
                      </div>
                    </div>
                    <button onClick={()=>deletePayment(p.id)} style={{position:"absolute",top:10,right:12,background:"none",border:"none",color:"#2A3A4A",cursor:"pointer",fontSize:15,padding:0}}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ BUDGET ══ */}
        {tab==="budget" && (
          <div>
            <div style={{...card(),marginBottom:18,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <div><div style={{fontSize:9,letterSpacing:2,color:"#B8860B",textTransform:"uppercase"}}>Allocated</div><div style={{fontSize:20,fontWeight:700,color:totalBudgetAll>500000?"#EF4444":"#F5ECD7"}}>${totalBudgetAll.toLocaleString()}</div></div>
              <div style={{color:"#2A3A4A",fontSize:18}}>/</div>
              <div><div style={{fontSize:9,letterSpacing:2,color:"#8A9DB0",textTransform:"uppercase"}}>Target</div><div style={{fontSize:20,fontWeight:700,color:"#8A9DB0"}}>$500,000</div></div>
              <div style={{flex:1,minWidth:140}}>
                <div style={{background:"#0F1923",borderRadius:99,height:7,overflow:"hidden"}}>
                  <div style={{height:"100%",background:totalBudgetAll>500000?"#EF4444":"#B8860B",width:`${Math.min(100,(totalBudgetAll/500000)*100)}%`,transition:"width 0.4s",borderRadius:99}}/>
                </div>
                <div style={{fontSize:9,color:totalBudgetAll>500000?"#EF4444":"#10B981",marginTop:3}}>{totalBudgetAll>500000?`Over by $${(totalBudgetAll-500000).toLocaleString()}`:`$${(500000-totalBudgetAll).toLocaleString()} remaining`}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
              {events.map(ev=>(
                <button key={ev.id} onClick={()=>setBudgetEvent(ev.id)} style={{background:budgetEvent===ev.id?ev.color:"#1C2A3A",color:budgetEvent===ev.id?"#fff":"#C9A96E",border:`1px solid ${budgetEvent===ev.id?ev.color:"#2A3A4A"}`,padding:"6px 13px",borderRadius:99,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:budgetEvent===ev.id?700:400}}>
                  {ev.emoji} {ev.label}
                </button>
              ))}
            </div>
            {(()=>{
              const ev=events.find(e=>e.id===budgetEvent);
              const bd=budget[budgetEvent];
              const evPayments=payments.filter(p=>p.event===budgetEvent);
              const totalSpentEur=evPayments.reduce((s,p)=>s+p.amountEur,0);
              const totalSpentUsd=eurToUsd(totalSpentEur,eurRate);
              const itemsSum=bd.items.reduce((s,i)=>s+i.cost,0);
              return(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
                    {[
                      {label:"Event Budget (USD)",val:"$"+bd.total.toLocaleString()},
                      {label:"Line Items Sum",val:"$"+itemsSum.toLocaleString(),col:itemsSum!==bd.total?"#F59E0B":"#10B981"},
                      {label:"Paid (EUR)",val:fmtEUR(totalSpentEur),col:"#F59E0B"},
                      {label:"Paid (USD)",val:fmtUSD(totalSpentUsd),col:"#F59E0B"},
                      {label:"Remaining",val:"$"+(bd.total-totalSpentUsd).toLocaleString(),col:bd.total-totalSpentUsd<0?"#EF4444":"#10B981"},
                    ].map(s=>(
                      <div key={s.label} style={{...card(),padding:"10px 14px"}}>
                        <div style={{fontSize:8,color:"#8A9DB0",letterSpacing:1,textTransform:"uppercase"}}>{s.label}</div>
                        <div style={{fontSize:17,fontWeight:700,color:s.col||"#F5ECD7",marginTop:3}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:9,padding:"9px 14px"}}>
                    <span style={{fontSize:11,color:"#B8860B",minWidth:110}}>Event Budget (USD):</span>
                    <span style={{color:"#8A9DB0",fontSize:11}}>$</span>
                    <input type="number" value={bd.total} onChange={e=>updateBudgetTotal(budgetEvent,e.target.value)} style={{...inp(),width:110,fontSize:15,fontWeight:700}}/>
                    <span style={{fontSize:10,color:"#4A5A6A",marginLeft:8}}>≈ {fmtEUR(bd.total/eurRate)} at current rate</span>
                  </div>
                  <div style={{background:"#1C2A3A",borderRadius:99,height:7,marginBottom:14,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:99,background:`linear-gradient(90deg,${ev.color},${ev.color}88)`,width:`${Math.min(100,(totalSpentUsd/bd.total)*100)}%`,transition:"width 0.5s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#8A9DB0",marginBottom:10}}>
                    💡 Payments against this event are logged in the <strong style={{color:"#B8860B",cursor:"pointer"}} onClick={()=>setTab("payments")}>Payments tab</strong>. Line items below are budget allocations only.
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {bd.items.map(item=>(
                      <div key={item.name} style={{display:"grid",gridTemplateColumns:"1fr 100px 80px 26px",alignItems:"center",gap:8,background:"#1A2535",border:"1px solid #253545",borderRadius:8,padding:"9px 12px"}}>
                        <input value={item.name} onChange={e=>updateItemName(budgetEvent,item.name,e.target.value)} style={{...inp(),fontSize:12}}/>
                        <div>
                          <div style={{fontSize:8,color:"#8A9DB0",letterSpacing:1}}>BUDGET (USD)</div>
                          <div style={{display:"flex",alignItems:"center",gap:1}}>
                            <span style={{fontSize:9,color:"#8A9DB0"}}>$</span>
                            <input type="number" value={item.cost} onChange={e=>updateItemCost(budgetEvent,item.name,e.target.value)} style={{...inp(),width:80,fontSize:12}}/>
                          </div>
                          <div style={{fontSize:8,color:"#4A5A6A",marginTop:1}}>≈ {fmtEUR(item.cost/eurRate)}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:8,color:"#8A9DB0",letterSpacing:1}}>% OF EVENT</div>
                          <div style={{fontSize:12,fontWeight:700,color:"#8A9DB0"}}>{bd.total>0?Math.round((item.cost/bd.total)*100):0}%</div>
                        </div>
                        <button onClick={()=>deleteBudgetItem(budgetEvent,item.name)} style={{background:"none",border:"none",color:"#3A4A5A",cursor:"pointer",fontSize:15,padding:0}}>×</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>addBudgetItem(budgetEvent)} style={{marginTop:10,background:"transparent",border:"1px dashed #2A3A4A",color:"#8A9DB0",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:11,fontFamily:"inherit",width:"100%"}}>+ Add line item</button>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ VENDORS ══ */}
        {tab==="vendors" && (
          <div>
            <div style={{background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:9,padding:"10px 16px",marginBottom:16,fontSize:11,color:"#8A9DB0"}}>
              💡 Vendor costs are shown in <strong style={{color:"#B8860B"}}>EUR</strong> since you're paying Portuguese vendors in euros. USD equivalent shown alongside.
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{margin:0,fontSize:11,letterSpacing:3,color:"#B8860B",textTransform:"uppercase",fontWeight:400}}>Vendor Tracker</h2>
              <button onClick={addVendor} style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>+ Add Vendor</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:"2px solid #B8860B"}}>
                    {["Event","Category","Name","Contact","Cost (€)","→ USD","Deposit (€)","→ USD","Status","Notes",""].map(h=>(
                      <th key={h} style={{padding:"7px 9px",textAlign:"left",color:"#B8860B",fontWeight:600,letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v,i)=>(
                    <tr key={v.id} style={{borderBottom:"1px solid #1E2D3D",background:i%2===0?"#141E2B":"#101820"}}>
                      <td style={{padding:"7px 9px"}}>
                        <select value={v.event} onChange={e=>updateVendor(v.id,"event",e.target.value)} style={{background:"transparent",color:"#C9A96E",border:"none",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}>
                          {[...events.map(e=>({id:e.id,label:e.label})),{id:"all",label:"All Events"}].map(ev=><option key={ev.id} value={ev.id} style={{background:"#1C2A3A"}}>{ev.label}</option>)}
                        </select>
                      </td>
                      <td style={{padding:"7px 9px"}}><input value={v.category} onChange={e=>updateVendor(v.id,"category",e.target.value)} style={{...inp(),width:85}}/></td>
                      <td style={{padding:"7px 9px"}}><input value={v.name} onChange={e=>updateVendor(v.id,"name",e.target.value)} style={{...inp(),width:120,fontWeight:600}}/></td>
                      <td style={{padding:"7px 9px"}}><input value={v.contact} onChange={e=>updateVendor(v.id,"contact",e.target.value)} style={{...inp(),width:130,color:"#8A9DB0"}}/></td>
                      <td style={{padding:"7px 9px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:1}}>
                          <span style={{color:"#8A9DB0",fontSize:9}}>€</span>
                          <input type="number" value={v.costEur} onChange={e=>updateVendor(v.id,"costEur",e.target.value)} style={{...inp(),width:65}}/>
                        </div>
                      </td>
                      <td style={{padding:"7px 9px",color:"#4A6A4A",fontSize:10}}>{fmtUSD(eurToUsd(v.costEur,eurRate))}</td>
                      <td style={{padding:"7px 9px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:1}}>
                          <span style={{color:"#F59E0B",fontSize:9}}>€</span>
                          <input type="number" value={v.depositEur} onChange={e=>updateVendor(v.id,"depositEur",e.target.value)} style={{...inp(),width:65,color:"#F59E0B"}}/>
                        </div>
                      </td>
                      <td style={{padding:"7px 9px",color:"#4A6A4A",fontSize:10}}>{fmtUSD(eurToUsd(v.depositEur,eurRate))}</td>
                      <td style={{padding:"7px 9px"}}>
                        <select value={v.status} onChange={e=>updateVendor(v.id,"status",e.target.value)} style={{background:"#1C2A3A",color:STATUS_COLORS[v.status]||"#fff",border:`1px solid ${STATUS_COLORS[v.status]||"#444"}`,borderRadius:99,padding:"2px 8px",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}>
                          {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s} style={{background:"#1C2A3A",color:STATUS_COLORS[s]}}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{padding:"7px 9px"}}><input value={v.notes} onChange={e=>updateVendor(v.id,"notes",e.target.value)} style={{...inp(),width:150,color:"#8A9DB0"}} placeholder="Notes…"/>
                        <VendorFiles vendorId={v.id} vendorName={v.name}/>
                      </td>
                      <td style={{padding:"7px 9px"}}><button onClick={()=>deleteVendor(v.id)} style={{background:"none",border:"none",color:"#3A4A5A",cursor:"pointer",fontSize:15}}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:16,marginTop:14,background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:9,padding:"10px 16px",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:9,color:"#8A9DB0",textTransform:"uppercase",letterSpacing:1}}>Total Vendor Cost</div>
                <div style={{fontSize:15,fontWeight:700,color:"#F5ECD7"}}>{fmtEUR(vendors.reduce((s,v)=>s+v.costEur,0))}</div>
                <div style={{fontSize:10,color:"#4A6A4A"}}>{fmtUSD(eurToUsd(vendors.reduce((s,v)=>s+v.costEur,0),eurRate))}</div>
              </div>
              <div>
                <div style={{fontSize:9,color:"#F59E0B",textTransform:"uppercase",letterSpacing:1}}>Total Deposits</div>
                <div style={{fontSize:15,fontWeight:700,color:"#F59E0B"}}>{fmtEUR(vendors.reduce((s,v)=>s+v.depositEur,0))}</div>
                <div style={{fontSize:10,color:"#4A6A4A"}}>{fmtUSD(eurToUsd(vendors.reduce((s,v)=>s+v.depositEur,0),eurRate))}</div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                {Object.entries(STATUS_COLORS).map(([s,c])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:c}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>{s} ({vendors.filter(v=>v.status===s).length})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ KANBAN ══ */}
        {tab==="kanban" && (
          <div>
            <div style={{fontSize:11,color:"#8A9DB0",marginBottom:16}}>Drag to move · Click title to edit · {kanban.done.length}/{Object.values(kanban).flat().length} complete</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[{key:"todo",label:"📋 To Do",color:"#EF4444"},{key:"inprogress",label:"⚙️ In Progress",color:"#F59E0B"},{key:"done",label:"✅ Done",color:"#10B981"}].map(col=>(
                <div key={col.key} onDragOver={e=>e.preventDefault()} onDrop={()=>onDrop(col.key)} style={{background:"#141E2B",borderRadius:12,border:`1px solid ${col.color}33`,minHeight:180}}>
                  <div style={{padding:"10px 12px",borderBottom:`2px solid ${col.color}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,color:col.color}}>{col.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{background:`${col.color}22`,color:col.color,fontSize:9,fontWeight:700,borderRadius:99,padding:"2px 7px"}}>{kanban[col.key].length}</span>
                      <button onClick={()=>setShowNewCard(showNewCard===col.key?null:col.key)} style={{background:`${col.color}22`,border:"none",color:col.color,borderRadius:6,width:20,height:20,cursor:"pointer",fontSize:14,lineHeight:"20px",padding:0}}>+</button>
                    </div>
                  </div>
                  {showNewCard===col.key&&(
                    <div style={{margin:"8px 8px 0",background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:8,padding:"9px 11px"}}>
                      <input placeholder="Task title…" value={newCard.title} onChange={e=>setNewCard(n=>({...n,title:e.target.value}))}
                        style={{...inp(),marginBottom:7,borderBottom:"1px solid #2A3A4A",paddingBottom:3,fontSize:12}}
                        onKeyDown={e=>{if(e.key==="Enter")addCard(col.key);if(e.key==="Escape")setShowNewCard(null);}} autoFocus/>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
                        <select value={newCard.event} onChange={e=>setNewCard(n=>({...n,event:e.target.value}))} style={{background:"#0F1923",border:"1px solid #2A3A4A",color:"#C9A96E",fontSize:10,borderRadius:5,padding:"2px 5px",fontFamily:"inherit"}}>
                          {[...events.map(e=>({id:e.id,label:e.label})),{id:"all",label:"All Events"}].map(ev=><option key={ev.id} value={ev.id} style={{background:"#0F1923"}}>{ev.label}</option>)}
                        </select>
                        <select value={newCard.priority} onChange={e=>setNewCard(n=>({...n,priority:e.target.value}))} style={{background:"#0F1923",border:"1px solid #2A3A4A",color:PRIORITY_COLORS[newCard.priority],fontSize:10,borderRadius:5,padding:"2px 5px",fontFamily:"inherit"}}>
                          {["high","med","low"].map(p=><option key={p} value={p} style={{background:"#0F1923",color:PRIORITY_COLORS[p]}}>{p}</option>)}
                        </select>
                        <input placeholder="Due e.g. 2026-10" value={newCard.due} onChange={e=>setNewCard(n=>({...n,due:e.target.value}))} style={{...inp(),width:100,border:"1px solid #2A3A4A",borderRadius:5,padding:"2px 5px",fontSize:10}}/>
                      </div>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>addCard(col.key)} style={{background:col.color,color:"#fff",border:"none",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"inherit",fontWeight:700}}>Add</button>
                        <button onClick={()=>setShowNewCard(null)} style={{background:"transparent",color:"#8A9DB0",border:"1px solid #2A3A4A",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div style={{padding:"6px",display:"flex",flexDirection:"column",gap:5}}>
                    {kanban[col.key].map(card=>{
                      const ev=events.find(e=>e.id===card.event)||{color:"#888",emoji:"📌",label:"All"};
                      const isEditing=editingCard?.col===col.key&&editingCard?.id===card.id;
                      return(
                        <div key={card.id} draggable={!isEditing} onDragStart={()=>!isEditing&&onDragStart(card,col.key)}
                          style={{background:"linear-gradient(145deg,#1C2A3A,#18242F)",border:"1px solid #2A3A4A",borderLeft:`3px solid ${PRIORITY_COLORS[card.priority]}`,borderRadius:7,padding:"8px 10px",cursor:isEditing?"default":"grab",userSelect:"none",position:"relative"}}>
                          {isEditing?(
                            <input autoFocus value={card.title} onChange={e=>updateCardTitle(col.key,card.id,e.target.value)} onBlur={()=>setEditingCard(null)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")setEditingCard(null);}} style={{...inp(),fontSize:11,borderBottom:"1px solid #B8860B",paddingBottom:2}}/>
                          ):(
                            <div style={{fontSize:11,color:"#F5ECD7",lineHeight:1.4,cursor:"text"}} onClick={()=>setEditingCard({col:col.key,id:card.id})}>{card.title}</div>
                          )}
                          <div style={{display:"flex",justifyContent:"space-between",marginTop:5,alignItems:"center"}}>
                            <span style={{fontSize:8,color:ev.color}}>{ev.emoji} {ev.label}</span>
                            <span style={{fontSize:8,color:"#8A9DB0"}}>↳ {card.due}</span>
                          </div>
                          <button onClick={()=>deleteCard(col.key,card.id)} style={{position:"absolute",top:4,right:5,background:"none",border:"none",color:"#2A3A4A",cursor:"pointer",fontSize:12,padding:0}}>×</button>
                        </div>
                      );
                    })}
                    {kanban[col.key].length===0&&showNewCard!==col.key&&<div style={{padding:"16px",textAlign:"center",color:"#2A3A4A",fontSize:11}}>Drop cards here</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CHECKLIST ══ */}
        {tab==="checklist" && (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:11,color:"#B8860B",letterSpacing:2,textTransform:"uppercase"}}>Overall Progress</span>
                <span style={{fontSize:12,color:"#F5ECD7"}}>{checkDone}/{checkTotal} done</span>
              </div>
              <div style={{background:"#1C2A3A",borderRadius:99,height:8,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#B8860B,#E8A020)",width:`${checkTotal>0?(checkDone/checkTotal)*100:0}%`,transition:"width 0.4s"}}/>
              </div>
            </div>
            {checklist.map((cat,ci)=>{
              const done=cat.items.filter(i=>i.done).length;
              return(
                <div key={cat.category} style={{background:"#141E2B",border:"1px solid #1E2D3D",borderRadius:12,marginBottom:12,overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",background:"#1A2535",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:"#C9A96E",fontWeight:600}}>{cat.category}</span>
                    <span style={{fontSize:9,color:done===cat.items.length?"#10B981":"#8A9DB0",background:"#0F1923",borderRadius:99,padding:"2px 8px"}}>{done}/{cat.items.length}</span>
                  </div>
                  <div style={{padding:"6px 12px"}}>
                    {cat.items.map((item,ii)=>{
                      const isEditingThis=editingCheck?.ci===ci&&editingCheck?.ii===ii;
                      return(
                        <div key={item.id||ii} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 4px",borderBottom:ii<cat.items.length-1?"1px solid #1E2D3D":"none"}}>
                          <div onClick={()=>toggleCheck(ci,ii)} style={{width:15,height:15,borderRadius:3,flexShrink:0,marginTop:2,border:`2px solid ${item.done?"#B8860B":"#3A4A5A"}`,background:item.done?"#B8860B":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s"}}>
                            {item.done&&<span style={{color:"#0F1923",fontSize:9,fontWeight:900}}>✓</span>}
                          </div>
                          {isEditingThis?(
                            <input autoFocus value={editCheckText} onChange={e=>setEditCheckText(e.target.value)}
                              onBlur={()=>saveCheckEdit(ci,ii)} onKeyDown={e=>{if(e.key==="Enter")saveCheckEdit(ci,ii);if(e.key==="Escape")setEditingCheck(null);}}
                              style={{...inp(),flex:1,fontSize:12,borderBottom:"1px solid #B8860B",paddingBottom:2,color:"#F5ECD7"}}/>
                          ):(
                            <span style={{fontSize:12,color:item.done?"#4A6A5A":"#D4C4A0",textDecoration:item.done?"line-through":"none",flex:1,lineHeight:1.4,cursor:"text"}}
                              onClick={()=>{setEditingCheck({ci,ii});setEditCheckText(item.text);}}>
                              {item.text}
                            </span>
                          )}
                          <button onClick={()=>deleteCheckItem(ci,ii)} style={{background:"none",border:"none",color:"#2A3A4A",cursor:"pointer",fontSize:13,padding:"0 2px",flexShrink:0}}>×</button>
                        </div>
                      );
                    })}
                    <div style={{display:"flex",gap:7,paddingTop:7,alignItems:"center"}}>
                      <input placeholder="Add item…" value={newCheckItem[ci]||""} onChange={e=>setNewCheckItem(n=>({...n,[ci]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")addCheckItem(ci);}}
                        style={{...inp(),flex:1,fontSize:11,borderBottom:"1px solid #1E2D3D",paddingBottom:3,color:"#8A9DB0"}}/>
                      <button onClick={()=>addCheckItem(ci)} style={{background:"transparent",border:"1px solid #2A3A4A",color:"#8A9DB0",borderRadius:5,padding:"2px 9px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Add</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ GUESTS ══ */}
        {tab==="guests" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
              {[
                {label:"Total",       val:guests.length},
                {label:"Confirmed",   val:guests.filter(g=>g.rsvp==="Confirmed").length,  col:"#10B981"},
                {label:"Pending",     val:guests.filter(g=>g.rsvp==="Pending").length,    col:"#F59E0B"},
                {label:"Declined",    val:guests.filter(g=>g.rsvp==="Declined").length,   col:"#EF4444"},
                {label:"Bride's Side",val:guests.filter(g=>g.side==="Bride").length,      col:"#8E44AD"},
                {label:"Groom's Side",val:guests.filter(g=>g.side==="Groom").length,      col:"#1A7FC1"},
              ].map(s=>(
                <div key={s.label} style={{...card(),padding:"10px 14px"}}>
                  <div style={{fontSize:9,color:"#8A9DB0",textTransform:"uppercase",letterSpacing:1}}>{s.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:s.col||"#F5ECD7",marginTop:3}}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
              <input placeholder="Search…" value={guestSearch} onChange={e=>setGuestSearch(e.target.value)} style={{...inp(),background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:8,padding:"6px 12px",width:140,fontSize:12}}/>
              <select value={guestFilter} onChange={e=>setGuestFilter(e.target.value)} style={{background:"#1A2535",border:"1px solid #2A3A4A",color:"#C9A96E",borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                <option value="all">All</option>
                {["Confirmed","Pending","Declined","Not Sent","Bride","Groom","Both"].map(f=><option key={f} value={f}>{f}</option>)}
              </select>
              <select value={guestSort} onChange={e=>setGuestSort(e.target.value)} style={{background:"#1A2535",border:"1px solid #2A3A4A",color:"#C9A96E",borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                <option value="name">Sort: Name</option>
                <option value="table">Sort: Table</option>
                <option value="rsvp">Sort: RSVP</option>
              </select>
              <button onClick={()=>setShowAddGuest(v=>!v)} style={{marginLeft:"auto",background:"#B8860B",color:"#0F1923",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>+ Add Guest</button>
            </div>
            {showAddGuest&&(
              <div style={{...card(),border:"1px solid #B8860B",marginBottom:16}}>
                <div style={{fontSize:11,color:"#B8860B",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>New Guest</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:12}}>
                  {[{l:"NAME *",f:"name",p:"Full name",t:"text"},{l:"TABLE #",f:"table",p:"e.g. 5",t:"text"},{l:"DIETARY",f:"dietary",p:"e.g. Veg",t:"text"},{l:"NOTES",f:"notes",p:"Any notes",t:"text"}].map(x=>(
                    <div key={x.f}>
                      <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>{x.l}</div>
                      <input type={x.t} value={newGuest[x.f]} onChange={e=>setNewGuest(g=>({...g,[x.f]:e.target.value}))} placeholder={x.p} style={{...inp(),background:"#0F1923",border:"1px solid #2A3A4A",borderRadius:6,padding:"6px 10px",fontSize:12}}/>
                    </div>
                  ))}
                  <div>
                    <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>SIDE</div>
                    <select value={newGuest.side} onChange={e=>setNewGuest(g=>({...g,side:e.target.value}))} style={{background:"#0F1923",border:"1px solid #2A3A4A",color:SIDE_COLORS[newGuest.side],borderRadius:6,padding:"6px 10px",fontSize:12,fontFamily:"inherit",width:"100%",cursor:"pointer"}}>
                      {["Bride","Groom","Both"].map(s=><option key={s} value={s} style={{background:"#0F1923",color:SIDE_COLORS[s]}}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#8A9DB0",marginBottom:3}}>RSVP</div>
                    <select value={newGuest.rsvp} onChange={e=>setNewGuest(g=>({...g,rsvp:e.target.value}))} style={{background:"#0F1923",border:"1px solid #2A3A4A",color:RSVP_COLORS[newGuest.rsvp],borderRadius:6,padding:"6px 10px",fontSize:12,fontFamily:"inherit",width:"100%",cursor:"pointer"}}>
                      {Object.keys(RSVP_COLORS).map(s=><option key={s} value={s} style={{background:"#0F1923",color:RSVP_COLORS[s]}}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:"#8A9DB0",marginBottom:6}}>ATTENDING EVENTS</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {events.map(ev=>(
                      <button key={ev.id} onClick={()=>setNewGuest(g=>({...g,events:g.events.includes(ev.id)?g.events.filter(e=>e!==ev.id):[...g.events,ev.id]}))}
                        style={{background:newGuest.events.includes(ev.id)?ev.color:"#1A2535",color:newGuest.events.includes(ev.id)?"#fff":"#C9A96E",border:`1px solid ${newGuest.events.includes(ev.id)?ev.color:"#2A3A4A"}`,borderRadius:99,padding:"4px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                        {ev.emoji} {ev.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addGuest} style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:7,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700}}>Add Guest</button>
                  <button onClick={()=>setShowAddGuest(false)} style={{background:"transparent",color:"#8A9DB0",border:"1px solid #2A3A4A",borderRadius:7,padding:"7px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancel</button>
                </div>
              </div>
            )}
            {filteredGuests.length===0?(
              <div style={{textAlign:"center",padding:"40px",color:"#2A3A4A",fontSize:13}}>{guests.length===0?"No guests yet — hit + Add Guest.":"No guests match your filter."}</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {filteredGuests.map(g=>(
                  <div key={g.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto auto auto 24px",alignItems:"center",gap:10,background:"#141E2B",border:"1px solid #1E2D3D",borderRadius:9,padding:"10px 14px"}}>
                    <div>
                      <div style={{fontSize:13,color:"#F5ECD7",fontWeight:600}}>{g.name}</div>
                      {g.dietary&&<div style={{fontSize:10,color:"#8A9DB0",marginTop:1}}>🍽 {g.dietary}</div>}
                      {g.notes&&<div style={{fontSize:10,color:"#8A9DB0",marginTop:1}}>💬 {g.notes}</div>}
                    </div>
                    <select value={g.side} onChange={e=>updateGuest(g.id,"side",e.target.value)} style={{background:"transparent",border:"none",color:SIDE_COLORS[g.side],fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                      {["Bride","Groom","Both"].map(s=><option key={s} value={s} style={{background:"#1C2A3A",color:SIDE_COLORS[s]}}>{s}</option>)}
                    </select>
                    <select value={g.rsvp} onChange={e=>updateGuest(g.id,"rsvp",e.target.value)} style={{background:"#1C2A3A",color:RSVP_COLORS[g.rsvp],border:`1px solid ${RSVP_COLORS[g.rsvp]}`,borderRadius:99,padding:"2px 9px",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}>
                      {Object.keys(RSVP_COLORS).map(s=><option key={s} value={s} style={{background:"#1C2A3A",color:RSVP_COLORS[s]}}>{s}</option>)}
                    </select>
                    <div style={{fontSize:11,color:"#8A9DB0"}}>Tbl <input value={g.table} onChange={e=>updateGuest(g.id,"table",e.target.value)} style={{...inp(),width:28,fontSize:11,color:"#C9A96E",display:"inline"}}/></div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {events.map(ev=>(
                        <div key={ev.id} onClick={()=>toggleGuestEvent(g.id,ev.id)} title={ev.label}
                          style={{width:18,height:18,borderRadius:"50%",background:g.events.includes(ev.id)?ev.color:"#1A2535",border:`1px solid ${g.events.includes(ev.id)?ev.color:"#2A3A4A"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8}}>
                          {ev.emoji}
                        </div>
                      ))}
                    </div>
                    <button onClick={()=>deleteGuest(g.id)} style={{background:"none",border:"none",color:"#2A3A4A",cursor:"pointer",fontSize:14,padding:0}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ NOTES ══ */}
        {tab==="notes" && (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#8A9DB0",marginBottom:10}}>Shared updates, decisions, and questions for the whole group.</div>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder={`Write a note as ${userName}…`} rows={3}
                  style={{...inp(),flex:1,background:"#1A2535",border:"1px solid #2A3A4A",borderRadius:10,padding:"10px 14px",fontSize:13,resize:"vertical",lineHeight:1.5}}/>
                <button onClick={addNote} style={{background:"#B8860B",color:"#0F1923",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:700,whiteSpace:"nowrap"}}>Post</button>
              </div>
            </div>
            {notes.length===0?(
              <div style={{textAlign:"center",padding:"40px",color:"#2A3A4A",fontSize:13}}>No notes yet.</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {notes.map(n=>{
                  const col=AUTHOR_COLORS[n.author]||"#B8860B";
                  return(
                    <div key={n.id} style={{background:"#141E2B",border:`1px solid ${col}33`,borderLeft:`3px solid ${col}`,borderRadius:10,padding:"14px 16px",position:"relative"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{(n.author||"?")[0]}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:col}}>{n.author}</div>
                          <div style={{fontSize:9,color:"#8A9DB0"}}>{new Date(n.ts).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                        </div>
                      </div>
                      <div style={{fontSize:13,color:"#D4C4A0",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.text}</div>
                      {n.author===userName&&<button onClick={()=>deleteNote(n.id)} style={{position:"absolute",top:10,right:12,background:"none",border:"none",color:"#2A3A4A",cursor:"pointer",fontSize:14,padding:0}}>×</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ GMAIL ══ */}
        {tab==="gmail" && <GmailTab vendors={vendors}/>}

      </div>
    </div>
  );
}
