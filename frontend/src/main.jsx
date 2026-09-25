import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload, Mic, MicOff, Play, Clock, Brain, Briefcase, BookOpen,
  BarChart3, ArrowRight, CheckCircle, ChevronDown, LogOut, User,
  AlertTriangle, History, Lock, Home as HomeIcon, FileText, Code2, Calculator,
  Map, Menu, X, Sun, Moon, Flame, Target
} from "lucide-react";
import "./style.css";

const API = "http://localhost:5000";
const subjectGroups = [
  { title:"Core Programming", items:["Java","OOP","Python","DBMS","Operating Systems"] },
  { title:"MERN / Web Development", items:["MongoDB","React","Node.js","Express.js","HTML","CSS","JavaScript"] }
];
const subjects = subjectGroups.flatMap(g=>g.items);

const navItems = [
  {id:"home", label:"Home", emoji:"🏠", icon:HomeIcon},
  {id:"resume", label:"Resume Analyzer", emoji:"📄", icon:FileText},
  {id:"mock", label:"Mock Interview", emoji:"🎤", icon:Mic},
  {id:"questions", label:"Top 50 Questions", emoji:"📚", icon:BookOpen},
  {id:"study", label:"Study Roadmap", emoji:"🗺️", icon:Map},
  {id:"coding", label:"Coding Practice", emoji:"💻", icon:Code2},
  {id:"aptitude", label:"Aptitude Lab", emoji:"🧮", icon:Calculator},
  {id:"history", label:"History", emoji:"🕒", icon:History},
];

function authHeaders(json=true) {
  const token = localStorage.getItem("interviewai_token");
  return {
    ...(json ? {"Content-Type":"application/json"} : {}),
    ...(token ? {Authorization:`Bearer ${token}`} : {})
  };
}

function App() {
  const [page,setPage] = useState("home");
  const [user,setUser] = useState(null);
  const [authMode,setAuthMode] = useState("login");
  const [authLoading,setAuthLoading] = useState(false);
  const [resume,setResume] = useState(null);
  const [analysis,setAnalysis] = useState(null);
  const [config,setConfig] = useState({type:"Technical",difficulty:"Medium",duration:10});
  const [session,setSession] = useState(null);
  const [answers,setAnswers] = useState([]);
  const [report,setReport] = useState(null);
  const [loading,setLoading] = useState(false);
  const [history,setHistory] = useState([]);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const [theme,setTheme] = useState(()=>localStorage.getItem("interviewai_theme")||"dark");

  useEffect(()=>{
    document.documentElement.setAttribute("data-theme",theme);
    localStorage.setItem("interviewai_theme",theme);
  },[theme]);

  useEffect(()=>{
    const token=localStorage.getItem("interviewai_token");
    if(!token) return;
    fetch(`${API}/api/auth/me`,{headers:authHeaders(false)})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>setUser(d.user))
      .catch(()=>localStorage.removeItem("interviewai_token"));
  },[]);

  async function authenticate(form) {
    try {
      setAuthLoading(true);
      const endpoint=authMode==="login" ? "login" : "signup";
      const r=await fetch(`${API}/api/auth/${endpoint}`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Authentication failed");
      localStorage.setItem("interviewai_token",data.token);
      setUser(data.user);
      setPage("home");
    } catch(e) { alert(e.message); }
    finally { setAuthLoading(false); }
  }

  function logout() {
    localStorage.removeItem("interviewai_token");
    setUser(null); setAnalysis(null); setReport(null); setSession(null); setPage("auth");
  }

  async function analyze(file) {
    try {
      setResume(file); setLoading(true);
      const fd=new FormData(); fd.append("resume",file);
      const r=await fetch(`${API}/api/resume/analyze`,{method:"POST",headers:authHeaders(false),body:fd});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Resume analysis failed");
      setAnalysis(data); setPage("resume");
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function start() {
    try {
      if (config.type === "Technical" && !analysis) {
        alert("Please upload and analyze your resume before starting a Technical Interview. The technical interview is resume-personalized.");
        setPage("resume");
        return;
      }
      setLoading(true);
      const r=await fetch(`${API}/api/interview/start`,{
        method:"POST",headers:authHeaders(),body:JSON.stringify({...config,resumeText:analysis?.extractedText||"",resumeQuestions:analysis?.resumeInterviewQuestions||[]})
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Unable to start interview");
      setSession({...data,index:0,timeLeft:config.duration*60});
      setAnswers([]); setPage("interview");
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function finish(finalAnswers=answers) {
    try {
      setLoading(true);
      const r=await fetch(`${API}/api/interview/evaluate`,{
        method:"POST",headers:authHeaders(),
        body:JSON.stringify({
          answers:finalAnswers,
          type:config.type,
          difficulty:config.difficulty,
          totalQuestions: session?.questions?.length || finalAnswers.length
        })
      });
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Evaluation failed");
      setReport(data); setSession(null); setPage("report");
      loadHistory();
    } catch(e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function finishLive(liveAnswers) {
    try {
      setLoading(true);
      const r=await fetch(`${API}/api/interview/evaluate`,{method:"POST",headers:authHeaders(),body:JSON.stringify({answers:liveAnswers,type:config.type,difficulty:config.difficulty,totalQuestions:liveAnswers.length})});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Live evaluation failed");
      setReport(data); setPage("report");
      loadHistory();
    } catch(e) { alert(e.message); } finally { setLoading(false); }
  }

  async function loadHistory() {
    try {
      const r=await fetch(`${API}/api/interview/history`,{headers:authHeaders(false)});
      if(r.ok) setHistory(await r.json());
    } catch {}
  }

  useEffect(()=>{ if(user) loadHistory(); },[user]);

  if(!user) {
    return <Auth mode={authMode} setMode={setAuthMode} onSubmit={authenticate} loading={authLoading}/>;
  }

  const goTo = (p)=>{ setPage(p); setSidebarOpen(false); };
  const current = navItems.find(n=>n.id===page) || navItems[0];

  return (
    <div className={`app ${sidebarOpen?"sidebarOpen":""}`}>
      <aside className="sidebar">
        <div className="sidebarBrand" onClick={()=>goTo("home")}>
          <div className="logo">HM</div>
          <div><span>HireMind</span><small>AI Interview Coach</small></div>
        </div>
        <nav className="sidebarNav">
          {navItems.map(item=>{
            const Icon=item.icon;
            return (
              <button key={item.id} className={`navItem ${page===item.id?"selected":""}`} onClick={()=>goTo(item.id)}>
                <Icon size={18}/>
                <span className="navLabel">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebarFooter">
          <button className="themeToggle" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}>
            {theme==="dark"?<><Moon size={15}/> <b>Dark mode</b></>:<><Sun size={15}/> <b>Light mode</b></>}
          </button>
          <div className="userBadge">
            <div className="avatarCircle">{user.name.charAt(0).toUpperCase()}</div>
            <div><b>{user.name}</b><small>Signed in</small></div>
          </div>
          <button className="logoutBtn" onClick={logout}><LogOut size={16}/> Logout</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebarOverlay" onClick={()=>setSidebarOpen(false)}/>}

      <div className="mainArea">
        <div className="topbar">
          <button className="hamburger" onClick={()=>setSidebarOpen(true)}><Menu size={19}/></button>
          <div className="topbarBrand"><span className="logo">HM</span> {current.label}</div>
          <div className="topbarUser userBadge">
            <div className="avatarCircle">{user.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>

      {page==="home"&&<Home go={setPage} user={user} history={history}/>}
      {page==="resume"&&<Resume analysis={analysis} loading={loading} onFile={analyze} go={setPage}/>}
      {page==="mock"&&<Config config={config} setConfig={setConfig} start={start} loading={loading} hasResume={!!analysis} go={setPage}/>}
      {page==="interview"&&session&&<Interview session={session} setSession={setSession} answers={answers} setAnswers={setAnswers} finish={finish}/>}
      {page==="live"&&<LiveChat type={config.type} difficulty={config.difficulty} duration={config.duration} resumeText={analysis?.extractedText||""} onExit={()=>setPage("mock")} onComplete={finishLive}/>}
      {page==="report"&&<Report report={report} go={setPage}/>}
      {page==="questions"&&<Questions/>}
      {page==="study"&&<StudyRoadmap userId={user.id}/> }
      {page==="coding"&&<CodingPractice userId={user.id}/> }
      {page==="aptitude"&&<Aptitude/>}
      {page==="history"&&<HistoryPage history={history}/>}
      </div>
    </div>
  );
}

function Auth({mode,setMode,onSubmit,loading}) {
  const [form,setForm]=useState({name:"",email:"",password:""});
  return <main className="authPage">
    <div className="authCard">
      <div className="authLogo">🤖</div>
      <div className="eyebrow">✨ INTERVIEWAI</div>
      <h1>{mode==="login"?"Welcome back 👋":"Create your account 🚀"}</h1>
      <p>{mode==="login"?"Sign in to continue your personalized interview practice.":"Create a personal account to save your resume analysis and interview history."}</p>
      {mode==="signup"&&<input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}
      <input type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input type="password" placeholder="Password (minimum 6 characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <button className="primary full" disabled={loading} onClick={()=>onSubmit(form)}><Lock size={18}/>{loading?"Please wait...":mode==="login"?"Login":"Create Account"}</button>
      <button className="linkButton" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"New user? Create an account":"Already have an account? Login"}</button>
    </div>
  </main>;
}

function Home({go,user,history=[]}) {
  const total = history.length;
  const avg = total ? Math.round(history.reduce((s,h)=>s+(h.overallScore||0),0)/total) : 0;
  const best = total ? Math.max(...history.map(h=>h.overallScore||0)) : 0;
  return <main className="hero">
    <div className="pill">✨ PERSONALIZED AI INTERVIEW PRACTICE</div>
    <h1>Hello, {user.name.split(" ")[0]} 👋<br/><span>Practice. Improve. Repeat.</span></h1>
    <p>Your interviews are evaluated strictly question-by-question. Irrelevant, one-word, and empty answers are not rewarded.</p>
    <div className="actions">
      <button className="primary" onClick={()=>go("mock")}>🚀 Start Mock Interview <ArrowRight/></button>
      <button className="secondary" onClick={()=>go("resume")}>📄 Analyze Resume</button>
    </div>

    <div className="heroArt" aria-hidden="true">
      <svg viewBox="0 0 600 220" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff"/><stop offset="100%" stopColor="#22d3ee"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="190" rx="230" ry="18" fill="url(#g1)" opacity=".12"/>
        <rect x="120" y="35" width="360" height="120" rx="24" fill="url(#g1)" opacity=".14"/>
        <rect x="140" y="55" width="320" height="80" rx="16" fill="url(#g1)" opacity=".25"/>
        <circle cx="200" cy="95" r="18" fill="url(#g1)" opacity=".55"/>
        <circle cx="260" cy="95" r="18" fill="url(#g1)" opacity=".55"/>
        <circle cx="320" cy="95" r="18" fill="url(#g1)" opacity=".55"/>
        <rect x="90" y="20" width="50" height="50" rx="14" fill="url(#g1)" opacity=".8"/>
        <rect x="460" y="120" width="50" height="50" rx="14" fill="url(#g1)" opacity=".8"/>
        <text x="105" y="55" fontSize="26">🤖</text>
        <text x="475" y="155" fontSize="26">🎯</text>
      </svg>
    </div>

    {total>0 && <div className="statsRow">
      <div className="statCard"><span className="statEmoji">📊</span><b>{total}</b><span>Interviews Taken</span></div>
      <div className="statCard"><span className="statEmoji">🎯</span><b>{avg}</b><span>Average Score</span></div>
      <div className="statCard"><span className="statEmoji">🏆</span><b>{best}</b><span>Best Score</span></div>
    </div>}

    <section className="homeExamples">
      <div className="eyebrow">QUICK PRACTICE</div><h2>Aptitude Formula Examples</h2><p>One worked example for each major aptitude question type.</p>
      <div className="exampleGrid">{advancedExamples.map((ex,i)=><article className="exampleCard" key={i}><span className="exampleTopic">{ex.topic}</span><h3>{ex.q}</h3><ol>{ex.steps.map((step,j)=><li key={j}>{step}</li>)}</ol><strong>Answer: {ex.answer}</strong></article>)}</div>
    </section>

    <div className="cards">
      <Feature emoji="🧠" icon={<Brain/>} title="Resume-Based Technical" text="Technical questions are generated from technologies and projects detected in your uploaded resume."/>
      <Feature emoji="💼" icon={<Briefcase/>} title="Strict HR Evaluation" text="Answers are checked for relevance, examples, reasoning and completeness."/>
      <Feature emoji="📚" icon={<BookOpen/>} title="Top 50 Questions" text="Exactly 50 core questions for each major interview subject."/>
      <Feature emoji="📈" icon={<BarChart3/>} title="Detailed Report" text="See every question score, missing points and your weakest questions."/>
      <Feature emoji="🎙️" icon={<Mic/>} title="AI Live Voice" text="Have a natural voice conversation with a persistent microphone and a 5-second response delay."/>
      <Feature emoji="🗺️" icon={<BookOpen/>} title="Study Roadmap" text="Learn every essential interview concept in a structured beginner-to-advanced roadmap."/>
    </div>
  </main>;
}

function Feature({icon,emoji,title,text}) { return <div className="feature"><span className="featureEmoji">{emoji}</span>{icon}<h3>{title}</h3><p>{text}</p></div>; }

function Resume({analysis,loading,onFile,go}) {
  return <main className="page">
    <div className="sectionHead"><div><div className="eyebrow">📄 RESUME ANALYZER</div><h2>Know where your resume fits. 🎯</h2><p>Upload your PDF resume. Technical interviews will use the detected technologies and recognizable projects.</p></div></div>
    <label className="drop"><Upload/><strong>{loading?"Analyzing...":"Drop your resume here or click to upload"}</strong><small>PDF up to 5 MB</small><input type="file" accept=".pdf,.doc,.docx" onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/></label>
    {analysis&&<>
      <div className="panel"><h3>Resume Summary</h3><div className="chips">{(analysis.skills||[]).map(s=><span key={s}>{s}</span>)}</div><p>{analysis.summary}</p>{analysis.projects?.length>0&&<p><b>Detected projects:</b> {analysis.projects.join(", ")}</p>}</div>
      <div className="panel"><h3>Top 3 Role Matches</h3><div className="rolegrid">{(analysis.matchedRoles||[]).map(r=><div className="role" key={r.name}><div className="roleTop"><b>{r.name}</b><strong>{r.percentage}%</strong></div><div className="bar"><i style={{width:`${r.percentage}%`}}></i></div></div>)}</div><small>These are resume-skill estimates, not hiring probabilities.</small></div>
      <div className="panel resumeQuestionsPanel"><h3>Questions generated directly from your resume</h3><p>The technical interview uses these resume-grounded questions and can jump between them instead of following this displayed order.</p><div className="resumeQuestionGrid">{(analysis.resumeInterviewQuestions||[]).slice(0,10).map((q,i)=><div className="resumeQuestion" key={i}><span>Resume Q{i+1}</span><b>{q.question}</b><small>{q.source||"Resume evidence"}</small></div>)}</div></div>
      <button className="primary" onClick={()=>go("mock")}>🚀 Start Personalized Technical Interview <ArrowRight/></button>
    </>}
  </main>;
}

function Config({config,setConfig,start,loading,hasResume,go}) {
  return <main className="page narrow configPage"><div className="eyebrow">🎯 MOCK INTERVIEW STUDIO</div><h2>Choose how your AI interview should feel.</h2><p>First choose HR or Technical. Then select a normal interval interview or a natural AI Live voice conversation.</p>
    <div className="configPanel glassPanel">
      <h3>1 · Interview type</h3><div className="modeCards">{["Technical","HR"].map(x=><button key={x} className={`modeCard ${config.type===x?"selected":""}`} onClick={()=>setConfig({...config,type:x})}><span>{x==="Technical"?<Brain/>:<Briefcase/>}</span><b>{x}</b><small>{x==="Technical"?"Resume-focused technical questions":"Natural HR and behavioral questions"}</small></button>)}</div>
      {config.type==="Technical"&&!hasResume&&<div className="notice"><AlertTriangle size={18}/> Upload your resume first for a truly personalized technical interview.</div>}
      <h3>2 · Interview mode</h3><div className="modeCards">{[{id:"interval",title:"Timed Q&A",desc:"Question → answer → submit → next question",icon:<Clock/>},{id:"live",title:"AI Live Voice",desc:"Natural voice conversation with 5-second silence detection",icon:<Mic/>}].map(x=><button key={x.id} className={`modeCard ${config.mode===x.id?"selected":""}`} onClick={()=>setConfig({...config,mode:x.id})}><span>{x.icon}</span><b>{x.title}</b><small>{x.desc}</small></button>)}</div>
      <h3>3 · Difficulty</h3><div className="toggle">{["Easy","Medium","Hard"].map(x=><button key={x} className={config.difficulty===x?"selected":""} onClick={()=>setConfig({...config,difficulty:x})}>{x}</button>)}</div>
      <h3>4 · Duration</h3><div className="toggle durationPresets">{[5,10,15,20,30].map(x=><button key={x} className={config.duration===x?"selected":""} onClick={()=>setConfig({...config,duration:x})}>{x} min</button>)}</div>
      <div className="customDuration"><label>Custom duration (1–120 minutes)</label><div className="durationInput"><Clock size={18}/><input type="number" min="1" max="120" value={config.duration} onChange={e=>setConfig({...config,duration:Math.min(120,Math.max(1,Number(e.target.value)||1))})}/><span>minutes</span></div></div>
      <div className="configActions"><button className="secondary" onClick={()=>go("study")}>🗺️ Study Roadmap</button><button className="primary" onClick={()=>config.mode==="live"?go("live"):start()} disabled={loading || (config.type==="Technical"&&!hasResume)}>{config.mode==="live"?<><Mic/>🎙️ Enter Live Voice</>:<><Play/>🚀 Start Interview</>}</button></div>
    </div>
  </main>;
}

function Interview({session,setSession,answers,setAnswers,finish}) {
  const [listening,setListening]=useState(false);
  const [text,setText]=useState("");
  const rec=useRef(null);

  useEffect(()=>{
    const blockClipboard=(e)=>{ e.preventDefault(); };
    const blockKeys=(e)=>{
      if ((e.ctrlKey||e.metaKey) && ["c","v","x"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener("copy",blockClipboard);
    document.addEventListener("cut",blockClipboard);
    document.addEventListener("paste",blockClipboard);
    document.addEventListener("drop",blockClipboard);
    document.addEventListener("contextmenu",blockClipboard);
    document.addEventListener("keydown",blockKeys);
    return ()=>{
      document.removeEventListener("copy",blockClipboard);
      document.removeEventListener("cut",blockClipboard);
      document.removeEventListener("paste",blockClipboard);
      document.removeEventListener("drop",blockClipboard);
      document.removeEventListener("contextmenu",blockClipboard);
      document.removeEventListener("keydown",blockKeys);
    };
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>setSession(s=>{
      if(!s)return s;
      if(s.timeLeft<=1){clearInterval(id);return {...s,timeLeft:0};}
      return {...s,timeLeft:s.timeLeft-1};
    }),1000);
    return ()=>clearInterval(id);
  },[setSession]);

  useEffect(()=>{if(session?.timeLeft===0)finish(answers);},[session?.timeLeft]);

  if(!session?.questions?.length)return <main className="page narrow"><h2>No questions available.</h2></main>;

  const q=session.questions[session.index];
  function startVoice() {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Speech recognition is unavailable. Use text mode.");return;}
    const r=new SR(); r.continuous=false; r.interimResults=true; r.lang="en-IN";
    r.onresult=e=>setText(Array.from(e.results).map(x=>x[0].transcript).join(""));
    r.onend=()=>setListening(false); r.onerror=()=>setListening(false);
    r.start(); rec.current=r; setListening(true);
  }
  function stopVoice(){if(rec.current)rec.current.stop();setListening(false);}
  function submit() {
    if(!text.trim()){alert("Please answer the question. Empty answers receive 0.");return;}
    const updated=[...answers,{question:q,answer:text.trim()}]; setAnswers(updated);setText("");
    if(session.index+1<session.questions.length)setSession(s=>({...s,index:s.index+1}));
    else finish(updated);
  }
  const mins=String(Math.floor(session.timeLeft/60)).padStart(2,"0");
  const secs=String(session.timeLeft%60).padStart(2,"0");
  const totalSeconds=Math.max(1,(session.duration||10)*60);
  const timerProgress=Math.max(0,Math.min(100,(session.timeLeft/totalSeconds)*100));

  return <main className="interview">
    <div className="interviewTop">
      <div><span className="modeBadge">{session.type}</span><span className="difficultyBadge">{session.difficulty}</span></div>
      <div className="timerLock" title="Interview timer"><Clock/><div><small>TIME LEFT</small><strong>{mins}:{secs}</strong></div><i style={{"--progress":`${timerProgress}%`}}></i></div>
    </div>
    <div className="progressText">Question {session.index+1} of {session.questions.length}</div>
    <div className="aiCard"><div className="avatar">AI</div><div><small>AI INTERVIEWER</small><h2>{q.question}</h2></div></div>
    <div className="answerBox"><textarea value={text} onChange={e=>setText(e.target.value)} onPaste={e=>e.preventDefault()} onDrop={e=>e.preventDefault()} onContextMenu={e=>e.preventDefault()} placeholder="Type your answer or use the microphone..."/>
      <div className="answerActions"><button className={listening?"recording":"mic"} onClick={listening?stopVoice:startVoice}>{listening?<MicOff/>:<Mic/>}{listening?" Listening...":" Speak"}</button><button className="primary" onClick={submit}>Submit Answer <ArrowRight/></button></div>
    </div>
    <div className="antiCopyNotice"><Lock size={15}/> Copy, paste, cut and context-menu actions are disabled during the interview. You can type or use voice input.</div>
    <button className="end" onClick={()=>finish(answers)}>End Interview</button>
  </main>;
}

function Report({report,go}) {
  const results=report?.questionResults||[];
  return <main className="page">
    <div className="eyebrow">🏁 INTERVIEW COMPLETE</div>
    <h2>Strict performance report</h2>
    <div className="reportHero"><div className="score">{report?.overallScore||0}<span>/100</span></div><div><h3>{report?.overallScore<40?"Needs major improvement":report?.overallScore<70?"Partial understanding":"Good overall performance"}</h3><p>{report?.feedback}</p></div></div>
    <div className="countGrid"><div><span>Attended</span><strong>{report?.questionsAttended||0}</strong></div><div><span>Unattended</span><strong>{report?.questionsUnattended||0}</strong></div><div><span>Total</span><strong>{report?.questionsTotal||0}</strong></div></div>
    <div className="panel"><h3>Question-by-question evaluation</h3>{results.map((r,i)=><div className="resultCard" key={`${r.question}-${i}`}><div className="resultTop"><b>Q{i+1}. {r.question}</b><strong className={r.score<50?"bad":r.score<75?"mid":"good"}>{r.score}/100</strong></div><p><b>Your answer:</b> {r.answer||"No answer"}</p><p><b>Status:</b> {r.status}</p><p><b>Review:</b> {r.feedback}</p>{r.missing?.length>0&&<p><b>Missing:</b> {r.missing.join(", ")}</p>}<p><b>How to improve:</b> {r.improvement}</p><p><b>Ideal direction:</b> {r.idealAnswer}</p></div>)}</div>
    <div className="panel"><h3><AlertTriangle/> Questions where performance was bad</h3>{(report?.badQuestions||[]).length===0?<p>No question scored below 50.</p>:(report.badQuestions||[]).map((q,i)=><div className="badQuestion" key={i}><b>Q: {q.question}</b><strong>{q.score}/100</strong><p>{q.reason}</p></div>)}</div>
    <button className="primary" onClick={()=>go("mock")}>🔁 Practice Again</button>
  </main>;
}


function LiveChat({type,difficulty,duration,resumeText,onExit,onComplete}) {
  const [messages,setMessages]=useState([{role:"ai",text:type==="Technical"?`Hi! I’m your live technical interviewer. I’ll mix resume-based and concept questions so the conversation does not feel like a fixed 1, 2, 3 sequence. Tell me about one project you can explain confidently.`:`Hi! I’m your live HR interviewer. I’ll ask questions naturally and may jump between topics. Tell me about yourself and the kind of software role you want to grow into.`}]);
  const [listening,setListening]=useState(false),[interim,setInterim]=useState(""),[elapsed,setElapsed]=useState(0),[sending,setSending]=useState(false),[typed,setTyped]=useState("");
  const rec=useRef(null), active=useRef(false), transcript=useRef(""), silence=useRef(null), conversation=useRef([]);
  const sessionId=useRef(`live-${Date.now()}`);
  useEffect(()=>{const id=setInterval(()=>setElapsed(x=>x+1),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(elapsed>=duration*60) endSession();},[elapsed]);
  useEffect(()=>()=>stopMic(),[]);
  function stopMic(){active.current=false;if(silence.current)clearTimeout(silence.current);if(rec.current){try{rec.current.stop()}catch{}}setListening(false);}
  function scheduleReply(){if(silence.current)clearTimeout(silence.current);silence.current=setTimeout(()=>sendTranscript(),5000);}
  async function sendTranscript(){const answer=transcript.current.trim();if(!answer||sending)return;transcript.current="";setInterim("");setSending(true);setMessages(m=>[...m,{role:"user",text:answer}]);
    try{const r=await fetch(`${API}/api/live-chat`,{method:"POST",headers:authHeaders(),body:JSON.stringify({type,difficulty,resumeText,sessionId:sessionId.current,message:answer})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Live reply failed");setMessages(m=>[...m,{role:"ai",text:d.reply}]);const lastAIQuestion=[...messages].reverse().find(x=>x.role==="ai")?.text||"Live interview question"; conversation.current.push({question:lastAIQuestion,answer});speak(d.reply);}catch(e){setMessages(m=>[...m,{role:"ai",text:"I could not generate a live reply. Please check the backend and AI API configuration."}]);}finally{setSending(false);}}
  function sendTyped(){const t=typed.trim();if(!t)return;transcript.current=t;setTyped("");sendTranscript();}
  function speak(text){if("speechSynthesis" in window){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="en-IN";u.rate=.96;window.speechSynthesis.speak(u)}}
  function startLive(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert("Live voice requires Chrome or Edge Speech Recognition. You can still use the text box below.");return;}if(active.current)return;active.current=true;setListening(true);const r=new SR();r.continuous=true;r.interimResults=true;r.lang="en-IN";r.onresult=e=>{let f="",it="";for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)f+=t+" ";else it+=t;}if(f)transcript.current+=f;setInterim(it);if(f||it)scheduleReply();};r.onend=()=>{if(active.current){try{r.start()}catch{}}else setListening(false)};r.onerror=e=>{if(e.error!=="no-speech"&&e.error!=="aborted")setMessages(m=>[...m,{role:"ai",text:`Microphone notice: ${e.error}. The live mic will remain active if the browser allows it.`}]);};rec.current=r;try{r.start()}catch{active.current=false;setListening(false);alert("Could not start the microphone.");}}
  async function endSession(){stopMic();if(window.speechSynthesis)window.speechSynthesis.cancel();if(conversation.current.length){await onComplete(conversation.current);}else{alert("No spoken answers were recorded, so there is nothing to evaluate yet.");onExit();}}
  return <main className="livePage"><div className="liveHeader"><button className="secondary" onClick={()=>{stopMic();onExit()}}>← Exit Live</button><div><span className="liveDot"></span><b>AI Live · {type}</b><small>{difficulty} · {String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</small></div><div className="liveHeaderActions"><button className={listening?"liveStop":"primary"} onClick={listening?stopMic:startLive}>{listening?<><MicOff/> Turn Mic Off</>:<><Mic/> Start Mic</>}</button><button className="endLive" onClick={endSession}>🏁 End Session & Evaluate</button></div></div>
    <div className="liveStage"><div className={`liveOrb ${listening?"activeOrb":""}`}><div className="orbCore">AI</div></div><div className="liveTitle">{sending?"AI is thinking…":listening?"Listening continuously…":"Live session ready"}</div><p>The microphone stays on until <b>you</b> turn it off. After speech ends, the system waits <b>5 seconds</b> before replying. Questions can be mixed rather than strictly sequential.</p></div>
    <div className="liveMessages">{messages.map((m,i)=><div className={`bubble ${m.role}`} key={i}><span>{m.role==="ai"?"AI":"You"}</span><p>{m.text}</p></div>)}{interim&&<div className="bubble user interim"><span>You · live</span><p>{interim}</p></div>}</div>
    <div className="liveComposer"><textarea value={typed} onChange={e=>setTyped(e.target.value)} placeholder="Type a response here if you prefer text..."/><button className="primary" onClick={sendTyped}>Send <ArrowRight size={17}/></button></div>
    <div className="liveFooter"><div className="micStatus"><span className={listening?"pulse":""}></span>{listening?"Microphone active — it will not auto-turn off":"Microphone paused"}</div><small>5-second silence gate · voice + text · end session automatically evaluates your answers</small></div>
  </main>;
}

const studyRoadmaps={
  "Java":["Java basics","Variables & data types","Operators","Conditions & loops","Arrays & Strings","Methods","Classes & Objects","Constructors","Encapsulation","Inheritance","Polymorphism","Abstraction","Interfaces","Exception handling","Collections","Generics","Multithreading","JVM/JDK/JRE","Memory & garbage collection","Streams & lambdas","File handling","JDBC","Java security basics","Testing & debugging","Production project structure"],
  "OOP":["Class & object","State & behavior","Constructor","Encapsulation","Abstraction","Inheritance","Polymorphism","Overloading","Overriding","Interface","Abstract class","Association","Aggregation","Composition","Coupling","Cohesion","SOLID","Dependency injection","Composition vs inheritance","Design principles","UML basics","Exception design","Immutability","Reusable components","OOP project design"],
  "Python":["Syntax & indentation","Variables & types","List / Tuple / Set / Dictionary","Slicing","Conditions & loops","Functions","Scope & LEGB","Comprehensions","Lambda","*args / **kwargs","Modules & packages","pip & virtual environments","Exceptions","Files & JSON","Iterators","Generators","Decorators","Context managers","OOP in Python","Dataclasses","Typing","Async programming","Threading & multiprocessing","GIL","Testing & debugging","Project structure"],
  "DBMS":["Database fundamentals","DBMS vs RDBMS","Tables & schema","Keys","Constraints","SQL basics","DDL / DML / DCL / TCL","SELECT & filtering","GROUP BY / HAVING","Joins","Subqueries","CTEs","Views","Indexes","Transactions","ACID","Concurrency","Locks","Deadlocks","Normalization 1NF–BCNF","Denormalization","Stored procedures","Triggers","Query plans","Backup & recovery","Replication","Sharding","CAP theorem","SQL injection & prepared statements","Database design project"],
  "Operating Systems":["OS fundamentals","Kernel & system calls","Processes","Threads","PCB","Context switching","CPU scheduling","FCFS / SJF / RR / Priority","Synchronization","Mutex / semaphore","Race condition","Deadlock","Deadlock prevention & avoidance","Memory management","Paging","Segmentation","Virtual memory","Page replacement","Thrashing","File systems","Disk scheduling","I/O management","Protection & security","Linux basics","OS troubleshooting"],
  "MongoDB":["NoSQL fundamentals","Documents & collections","BSON","CRUD","Queries & filters","Update operators","Arrays & nested documents","Indexes","Compound indexes","Aggregation","Pipeline stages","Lookup","Transactions","Replication","Sharding","Schema design","Embedding vs referencing","Mongoose","Validation","Middleware","MongoDB security","Connection pooling","Performance","Backup","Production patterns"],
  "React":["Web & component model","JSX","Components","Props","State","Events","Conditional rendering","Lists & keys","Forms","Controlled inputs","Hooks","useState","useEffect","useMemo","useCallback","useRef","Context API","Reducers","Custom hooks","Routing","API calls","Loading/error states","Performance","Code splitting","Testing","Production structure"],
  "Node.js":["Node runtime","V8 & event loop","Modules","npm","package.json","Async callbacks","Promises","async/await","Event loop phases","File system","Streams","Buffers","HTTP server","Environment variables","Error handling","Middleware concepts","Authentication","Security","Logging","Testing","Performance","Clustering","Process management","API architecture","Production deployment"],
  "Express.js":["Express fundamentals","Server setup","Routing","Route parameters","Query parameters","Middleware","Error middleware","Request/response","REST APIs","HTTP methods","Status codes","Validation","Authentication","Authorization","JWT","CORS","Rate limiting","Security headers","File uploads","Logging","Controllers","Services","Repositories","Testing","Production structure"],
  "HTML":["Document structure","Semantic HTML","Headings & paragraphs","Links","Images","Lists","Tables","Forms","Inputs","Labels","Validation","Audio/video","Accessibility","ARIA basics","Metadata","SEO basics","iframes","HTML APIs","Forms with APIs","Security basics","Responsive structure","DOM basics","Web storage","Best practices","Accessible page project"],
  "CSS":["Selectors","Specificity","Cascade","Box model","Display","Positioning","Flexbox","Grid","Units","Typography","Colors","Borders","Shadows","Pseudo classes","Pseudo elements","Responsive design","Media queries","Transitions","Transforms","Animations","Variables","Layout patterns","Accessibility","Mobile-first design","Component styling","Production CSS"],
  "JavaScript":["Syntax & variables","Data types","Operators","Conditions & loops","Functions","Scope","Hoisting","Arrays","Objects","Destructuring","Spread/rest","Template literals","DOM","Events","Forms","JSON","Promises","async/await","Fetch API","Error handling","Closures","Callbacks","this","Prototypes","Classes","Modules","ES6+","Event loop","Local storage","Security","Testing","Performance"],
};
const lessonLibrary={
  "Java basics": `JAVA BASICS\n\nWhat is Java?\nJava is a high-level, class-based, object-oriented programming language designed to be portable across platforms through the JVM.\n\nWhy Java?\n• Platform independent through bytecode + JVM\n• Object-oriented and strongly typed\n• Automatic memory management through garbage collection\n• Large standard library and ecosystem\n\nJDK vs JRE vs JVM\n• JVM: executes Java bytecode.\n• JRE: JVM + libraries required to run Java applications.\n• JDK: JRE + development tools such as javac, javadoc and debugging tools.\n\nBasic flow\n.java source → javac compiler → .class bytecode → JVM → machine-specific execution.\n\nInterview recall\nRemember: Write code with the JDK, run bytecode on the JVM, and the JRE provides the runtime environment.`,
  "Variables & data types": `JAVA DATA TYPES\n\nJava is statically typed: every variable has a declared type.\n\nPrimitive data types — 8\n1. byte — 8-bit signed integer\n2. short — 16-bit signed integer\n3. int — 32-bit signed integer\n4. long — 64-bit signed integer\n5. float — 32-bit floating-point value\n6. double — 64-bit floating-point value\n7. char — 16-bit Unicode character\n8. boolean — true or false\n\nReference types\n• String\n• Arrays\n• Classes / Objects\n• Interfaces\n• Enums\n• Other user-defined reference types\n\nImportant defaults / literals\n• Integer literals are int by default.\n• Decimal literals are double by default.\n• Use L for a long literal and F for a float literal.\n• char uses single quotes: 'A'.\n• String uses double quotes: "Hello".\n\nInterview recall\nPrimitive = value-oriented built-in types. Reference = stores a reference to an object.`,
  "Conditions & loops": `CONDITIONS & LOOPS\n\nDecision statements\n• if\n• if-else\n• else-if ladder\n• switch\n\nLoops\n• for — known/repeated iteration\n• while — repeat while condition is true\n• do-while — executes at least once\n\nLoop controls\n• break — exits the loop/switch\n• continue — skips the current iteration\n\nInterview recall\nChoose for when iteration is naturally counter-based; while when the continuation condition is the main driver.`,
  "Classes & Objects": `CLASSES & OBJECTS\n\nClass = blueprint containing data and behavior.\nObject = runtime instance of a class.\n\nA class can contain\n• fields\n• methods\n• constructors\n• nested types\n\nObject creation\nUse the new keyword for normal object creation.\n\nInterview recall\nClass describes what an object has and does; object is the actual instance stored/referenced at runtime.`
};
function genericLesson(subject,concept){
  const lower=concept.toLowerCase();
  let definition=`${concept} is an important ${subject} concept. It should be understood by its purpose, working, practical use and limitations.`;
  let working=`First understand the problem ${concept} solves. Then learn its main terms or syntax, the normal execution flow, and the trade-offs involved.`;
  let example=`Use ${concept} in a small ${subject} example where the concept solves a real programming or system problem.`;
  if(lower.includes("data type")) definition=`${concept} describes the kind of value a variable can store and the operations that are valid for that value.`;
  if(lower.includes("exception")) working=`Handle expected failures deliberately: identify the risky operation, catch or propagate the appropriate exception, and perform cleanup when required.`;
  if(lower.includes("api")) working=`A client sends a request to an endpoint, the server validates it, performs business logic, accesses data if needed, and returns a response with a status code and payload.`;
  if(lower.includes("index")) working=`An index stores an additional search structure so the database can locate matching records faster, but it adds storage and write/update cost.`;
  if(lower.includes("hook")) working=`A React Hook lets a function component use a React capability such as state, effects, refs or context without creating a class component.`;
  if(lower.includes("deadlock")) definition=`Deadlock is a situation where multiple processes or threads wait indefinitely for resources held by one another.`;
  if(lower.includes("normalization")) definition=`Normalization organizes relational data to reduce unnecessary duplication and update anomalies.`;
  if(lower.includes("polymorphism")) definition=`Polymorphism allows one interface or parent type to work with different concrete implementations.`;
  if(lower.includes("inheritance")) definition=`Inheritance allows a child class to reuse and extend behavior from a parent class.`;
  return `${concept.toUpperCase()}\n\n1. Definition\n${definition}\n\n2. Why it matters\nIt is commonly tested because interviewers want to know whether you understand not only the term but also when and why it should be used.\n\n3. How it works\n${working}\n\n4. Example\n${example}\n\n5. Common mistakes\n• Memorizing the definition without explaining the flow.\n• Confusing it with a closely related concept.\n• Giving no practical example.\n• Ignoring performance, security or maintainability when those factors matter.\n\n6. Interview questions\n• What is ${concept}?\n• Why is it used?\n• How does it work internally?\n• Give a simple example.\n• Compare it with a related concept.\n• What is one limitation or common mistake?\n\n7. Project connection\nExplain exactly where you used ${concept} in your own project, what you personally implemented, and what problem it solved.\n\n8. Quick revision\nDefinition → purpose → working → example → comparison → mistakes → project connection.`
}
function StudyRoadmap({userId}){
  const progressStorageKey=`interviewai_study_done_${userId}`;
  const [subject,setSubject]=useState("Java"),[done,setDone]=useState(()=>{try{return JSON.parse(localStorage.getItem(progressStorageKey)||"{}")}catch{return {}}}),[selected,setSelected]=useState(null),[lesson,setLesson]=useState(""),[lessonLoading,setLessonLoading]=useState(false);
  const list=studyRoadmaps[subject]||[];
  const toggle=i=>{const key=`${subject}:${i}`;const next={...done,[key]:!done[key]};setDone(next);localStorage.setItem(progressStorageKey,JSON.stringify(next));};
  async function openLesson(concept,i){setSelected(i);setLessonLoading(true);const local=lessonLibrary[concept];if(local){setLesson(local);setLessonLoading(false);return;}try{const r=await fetch(`${API}/api/study/explain`,{method:"POST",headers:authHeaders(),body:JSON.stringify({subject,concept})});const d=await r.json();setLesson(d.lesson||genericLesson(subject,concept));}catch{setLesson(genericLesson(subject,concept));}finally{setLessonLoading(false);}}
  const completed=list.filter((_,i)=>done[`${subject}:${i}`]).length,pct=Math.round(completed/list.length*100);
  return <main className="page studyPage"><div className="eyebrow">🗺️ LEARN SYSTEMATICALLY</div><h2>Interview Mastery Roadmap 🚀</h2><p>Track each subject step by step and mark concepts as learned.</p><div className="studyLayout"><aside className="studySide"><h3>Roadmaps</h3>{Object.keys(studyRoadmaps).map(s=><button className={subject===s?"selected":""} key={s} onClick={()=>{setSubject(s);setSelected(null)}}>{s}<span>{studyRoadmaps[s].length}</span></button>)}</aside><section className="roadmapPanel"><div className="roadmapHeader"><div><span className="eyebrow">{subject}</span><h3>{completed}/{list.length} concepts completed</h3></div><div className="studyProgress"><i style={{width:`${pct}%`}}></i><b>{pct}%</b></div></div><div className="roadmap">{list.map((concept,i)=><div className={`roadNode ${done[`${subject}:${i}`]?"done":""}`} key={concept}><div className="nodeLine"></div><button className="nodeDot" onClick={()=>toggle(i)}>{done[`${subject}:${i}`]?"✓":i+1}</button><div className="nodeCard"><small>STEP {String(i+1).padStart(2,"0")}</small><h4>{concept}</h4><p>Follow the concept in order and mark it learned when you are confident.</p><div className="nodeActions"><button className="markBtn" onClick={()=>toggle(i)}>{done[`${subject}:${i}`]?"Completed ✓":"Mark learned"}</button></div></div></div>)}</div></section></div></main>;
}

const aptitudeData={
  Quantitative:{
    "Percentage":["Percentage of a value — P% of X = (P / 100) × X", "Value from percentage — X = (P% × Total) / 100", "% of Total — P% = (Part / Total) × 100", "% Increase — % Increase = [(New − Old) / Old] × 100", "% Decrease — % Decrease = [(Old − New) / Old] × 100", "New value after % change — New = Old × (1 ± r/100) (+for increase, −for decrease)", "Successive % change — Net % = a + b + (a × b / 100) [both a,b can be +ve or −ve]", "Reverse: if A is x% more than B — Then B is less than A by: x/(100+x) × 100 %", "Reverse: if A is x% less than B — Then B is more than A by: x/(100−x) × 100 %", "Population after n years — P_n = P_0 × (1 + r/100)^n", "TRICK: % of % trick — x% of y = y% of x (swap and simplify!)", "TRICK: 15% shortcut — Find 10%, then add half of 10% → e.g. 15% of 80 = 8 + 4 = 12", "TRICK: Successive: +a% then −a% — Net result is always a LOSS of (a^2/100)% → e.g. +20% then −20% = −4%", "WHEN: WHEN to use successive % — When price increases/decreases in two steps, or population changes over 2 periods", "WHEN: WHEN to use reverse % — When asked: 'by what % is A less/more than B' — given the other direction", "KEY FRACTIONS TO MEMORISE: 1/2=50% | 1/3=33.33% | 1/4=25% | 1/5=20% | 1/6=16.67% | 1/7=14.28% | 1/8=12.5% | 1/9=11.11% | 1/10=10% | 1/11=9.09% | 1/12=8.33%"],
    "Ratio & Proportion":["Ratio definition — a : b = a/b | Equivalent: a:b = ka:kb (multiply/divide both by k)", "Proportion (4 terms) — a : b = c : d => a×d = b×c (Cross multiplication)", "3rd Proportional (x) — a : b = b : x => x = b² / a", "4th Proportional (x) — a : b = c : x => x = (b × c) / a", "Mean Proportional — Mean proportional between a and b = sqrt(a × b)", "Compounded Ratio — (a:b) compounded with (c:d) = ac : bd", "Duplicate Ratio — Duplicate of a:b = a² : b²", "Sub-duplicate Ratio — Sub-duplicate of a:b = sqrt(a) : sqrt(b)", "Triplicate Ratio — Triplicate of a:b = a³ : b³", "Dividing X in ratio a:b — First part = [a/(a+b)] × X | Second part = [b/(a+b)] × X", "Dividing X in a:b:c — Parts = [a/(a+b+c)]×X, [b/(a+b+c)]×X, [c/(a+b+c)]×X", "Mixture / Alligation — Cheaper qty / Dearer qty = (Dearer price − Mean price) / (Mean price − Cheaper price)", "TRICK: Alligation shortcut — Draw X: put mean in centre, cheaper top-left, dearer top-right. Subtract diagonally (always positive).", "If a/b = c/d (Componendo) — (a+b)/(a−b) = (c+d)/(c−d) [Componendo-Dividendo rule]", "WHEN: WHEN alligation — Use when two mixtures/grades are mixed and you need ratio of mixing quantities", "WHEN: WHEN cross-multiply — Use when 3 quantities are given and 4th is to be found (direct/inverse proportion)"],
    "Average & Weighted Average":["Average (Mean) — Average = Sum of all values / Number of values", "Sum from average — Sum = Average × n", "New average (value added) — New Avg = (Old Sum + New Value) / (n + 1)", "New avg (value removed) — New Avg = (Old Sum − Removed Value) / (n − 1)", "New avg (value replaced) — New Avg = Old Avg + (New Value − Old Value) / n", "Weighted Average — W_avg = (w1×x1 + w2×x2 + … + wn×xn) / (w1 + w2 + … + wn)", "Avg of 1 to n (natural) — Avg = (n + 1) / 2", "Sum of 1 to n — Sum = n(n+1) / 2", "Avg of first n odd nos — Avg = n (Sum = n^2)", "Avg of first n even nos — Avg = n + 1 (Sum = n(n+1))", "Avg of consecutive nos — Avg = (First term + Last term) / 2", "Avg of n² terms — Sum of 1^2+2^2+…+n^2 = n(n+1)(2n+1)/6 | Avg = (n+1)(2n+1)/6", "Avg of n³ terms — Sum of 1^3+2^3+…+n^3 = [n(n+1)/2]^2 | Avg = n(n+1)^2/4", "Overall avg of 2 groups — Avg = (n1×A1 + n2×A2) / (n1 + n2) where A1,A2 = group averages", "TRICK: Age problems — If avg age of group increases by x after y years → all members age by y → avg also increases by y", "WHEN: WHEN weighted avg — Use when groups of different sizes are combined and you need combined average", "WHEN: WHEN avg replaced — A person leaves/joins a group → use replacement formula to find unknown age/value"],
    "Profit & Loss":["Profit — Profit = SP − CP (when SP > CP)", "Loss — Loss = CP − SP (when CP > SP)", "Profit % — Profit% = (Profit / CP) × 100", "Loss % — Loss% = (Loss / CP) × 100", "SP when Profit% given — SP = CP × (100 + Profit%) / 100", "SP when Loss% given — SP = CP × (100 − Loss%) / 100", "CP from SP (Profit%) — CP = SP × 100 / (100 + Profit%)", "CP from SP (Loss%) — CP = SP × 100 / (100 − Loss%)", "Marked Price & Discount — Discount = MP − SP | Discount% = (Discount / MP) × 100", "SP with discount — SP = MP × (100 − Discount%) / 100", "MP from CP + Profit% — MP = CP × (100 + Profit%) / (100 − Discount%)", "Successive discounts — Net discount = d1 + d2 − (d1 × d2 / 100)", "TRICK: Two articles same SP — If each sold at SP with x% profit and x% loss → Net Loss% = x² / 100 (ALWAYS a loss!)", "False weight trick — If shopkeeper uses false weight W_false instead of W_true: Profit% = (W_true − W_false) / W_false × 100", "Cost price of n articles — CP of n = SP of m => Profit% = (n−m)/m × 100 | Loss% = (m−n)/n × 100", "WHEN: WHEN successive discount — Two discounts given one after another — always apply on reduced price, or use formula", "WHEN: WHEN false weight — Shopkeeper cheats on weight — find actual profit even if he claims to sell at cost price"],
    "Time & Work":["Work rate — If A completes work in n days → Rate of A = 1/n per day", "Work done in d days — Work done = d × (1/n) = d/n", "A & B together — Time = (A × B) / (A + B) where A,B are individual days", "A, B & C together — Time = 1 / (1/A + 1/B + 1/C)", "General n people — Net rate = sum of all individual rates = 1/A + 1/B + 1/C + …", "Work done by A in d days — Remaining = 1 − d/A", "Man-Days formula (MDH) — M1 × D1 × H1 = M2 × D2 × H2 (Men × Days × Hours = constant for same work)", "Wages distribution — Wages of A : Wages of B = Work done by A : Work done by B = (1/A) : (1/B)", "A more efficient than B — If A is x times as efficient as B → A takes work in (1/x) of B's time", "A leaves early — A works for d days, B completes rest → set up: d/A + t/B = 1, solve for t", "Alternate days (A,B,A,B) — Work in 2-day cycle = 1/A + 1/B → find how many complete cycles fit, handle remainder", "TRICK: LCM method (best trick) — Assume total work = LCM(A, B, C…) → each person's daily work = LCM/individual_days. No fractions!", "TRICK: A+B faster than A alone — Extra days saved = A − (AB/(A+B))", "WHEN: WHEN MDH — Number of workers or hours changes while completing SAME work → use M1D1H1 = M2D2H2", "WHEN: WHEN LCM method — Whenever multiple people work together — convert to units for clean calculation"],
    "Pipes & Cistern":["Inlet pipe fills in A hrs — Rate of inlet = +1/A (positive = fills)", "Outlet/Leak empties in B hrs — Rate of outlet = −1/B (negative = empties)", "Net rate (both open) — Net rate = 1/A − 1/B | Time to fill = 1 / (1/A − 1/B)", "Two inlets fill together — Time = (A × B) / (A + B)", "Inlet A, outlet B — Time to fill = (A × B) / (B − A) [only works if B > A, i.e. inlet faster]", "Three pipes A, B, C — Net rate = 1/A + 1/B − 1/C (if C is outlet)", "Cistern already 1/n full — Remaining = (1 − 1/n) fraction of work left → Time = remaining / net rate", "Pipe opened late — A opens first for t hrs, then B joins → A fills t/A in first t hrs, then both fill remaining together", "Leak empties full tank — Pipe fills in A hrs, leak empties in L hrs → effective fill rate = 1/A − 1/L → time = AL/(L−A)", "Leak-only time — If tank fills in A hrs with no leak, fills in B hrs with leak → leak empties in AB/(B−A) hrs", "TRICK: Sign rule trick — ALWAYS: inlet = +ve, outlet = −ve. Add all rates algebraically. Positive net = filling, negative = emptying.", "WHEN: WHEN to use formula — Leak/empty questions are same as Time & Work — treat pipes like workers, tank = 1 unit of work"],
    "Time, Speed & Distance":["Basic triangle — Distance (D) = Speed (S) × Time (T) | S = D/T | T = D/S", "Unit conversion — km/h to m/s: multiply by 5/18 | m/s to km/h: multiply by 18/5", "Average speed (equal dist) — Avg Speed = 2S1×S2 / (S1+S2) [Harmonic mean — use ONLY when distances are equal]", "Average speed (equal time) — Avg Speed = (S1 + S2) / 2 [Arithmetic mean — use ONLY when times are equal]", "Relative speed (opposite) — Relative Speed = S1 + S2", "Relative speed (same dir) — Relative Speed = |S1 − S2|", "Meeting point (towards) — Time to meet = Distance / (S1 + S2)", "Catch-up (same direction) — Time to catch = Initial Gap / (S_fast − S_slow)", "Circular track (same dir) — First meeting time = Track Length / |S1 − S2|", "Circular track (opp dir) — First meeting time = Track Length / (S1 + S2)", "Boat upstream speed — Upstream speed = B − R (B = boat in still water, R = river/stream speed)", "Boat downstream speed — Downstream speed = B + R", "Find B (boat speed) — B = (Downstream + Upstream) / 2", "Find R (river speed) — R = (Downstream − Upstream) / 2", "Distance = same, ratio — If speeds are in ratio S1:S2 → times are in ratio S2:S1 (inverse)", "TRICK: km/h → m/s trick — Multiply by 5/18. Quick: divide by 3.6. e.g. 72 km/h = 72/3.6 = 20 m/s", "TRICK: Avg speed trap — NEVER use (S1+S2)/2 for equal distances — it's WRONG. Use 2S1S2/(S1+S2) always.", "WHEN: WHEN relative speed — Two objects moving: towards each other or in same direction — always think relative speed first", "WHEN: WHEN boat formulas — Upstream/downstream → use B±R. Given two journey times/distances → set up two equations"],
    "Trains":["Cross a pole / person — Time = Length of Train / Speed of Train [pole/person has zero length]", "Cross a platform/bridge — Time = (Length of Train + Length of Platform) / Speed of Train", "Two trains (opposite dir) — Time to cross each other = (L1 + L2) / (S1 + S2)", "Two trains (same dir) — Time to cross each other = (L1 + L2) / |S1 − S2|", "Train crosses a man on platform — Time = Length of Train / Relative speed of train w.r.t. man", "Length of train from times — If train takes t1 to pass pole and t2 to pass platform of length P: L = P × t1/(t2−t1)", "Speed of train — Speed = Total distance covered / Time = (L_train + L_object) / Time", "TRICK: Key identity — Distance covered by train = Length of train + Length of object being crossed", "TRICK: Stationary object — Pole, person standing still, signal post → they have ZERO length (only train length counts)", "WHEN: WHEN same vs opposite — Same direction: trains are chasing → use |S1−S2|. Opposite: head-on → use S1+S2", "WHEN: WHEN pole vs platform — Pole/standing person → only train length. Platform/bridge/tunnel → add both lengths"],
    "Probability":["Basic probability — P(E) = Favourable outcomes / Total possible outcomes", "Range — 0 ≤ P(E) ≤ 1 | P(impossible event) = 0 | P(certain event) = 1", "Complement rule — P(not E) = 1 − P(E) → P(E') = 1 − P(E)", "Addition rule (general) — P(A or B) = P(A) + P(B) − P(A and B)", "Mutually exclusive — P(A or B) = P(A) + P(B) [since P(A and B) = 0]", "Independent events (and) — P(A and B) = P(A) × P(B)", "Dependent events (and) — P(A and B) = P(A) × P(B|A) [Conditional probability]", "Conditional probability — P(A|B) = P(A and B) / P(B)", "At least one — P(at least one) = 1 − P(none occur) [FASTEST method]", "Exactly r successes (Binomial) — P(X=r) = nCr × p^r × (1−p)^(n−r)", "Dice — 1 die — Sample space = 6. P(any specific number) = 1/6. P(even) = 3/6 = 1/2", "Dice — 2 dice — Sample space = 36. P(sum=7) = 6/36 = 1/6. P(sum=2 or 12) = 1/36 each", "Cards — standard deck — Total = 52. Suits = 4 (Spades,Hearts,Diamonds,Clubs). Each suit = 13 cards. Face cards = 12", "Coins — n coins — Sample space = 2^n. P(exactly r heads) = nCr / 2^n", "Combination nCr — nCr = n! / [r! × (n−r)!]", "Permutation nPr — nPr = n! / (n−r)!", "TRICK: At least one trick — P(at least 1 head in 3 tosses) = 1 − P(all tails) = 1 − (1/2)^3 = 7/8. Much faster!", "WHEN: WHEN complement — Any 'at least 1', 'at least once', 'not all' problems → always use complement method", "WHEN: WHEN binomial — Fixed n trials, only 2 outcomes (success/failure), same p each trial → use binomial"],
    "Permutation, Combination & Seating Arrangement":["Permutation nPr — nPr = n! / (n−r)! [Ordered — arrangement matters]", "Combination nCr — nCr = n! / [r! × (n−r)!] [Unordered — selection only]", "nC0 = nCn — nC0 = 1 | nC1 = n | nCr = nC(n−r)", "Linear arrangement (n) — n distinct objects in a row = n! ways", "Circular arrangement — (n−1)! [one person fixed to remove rotational duplicates]", "Necklace / Garland — (n−1)! / 2 [flipping = same, so divide by 2]", "Always together (linear) — Treat group of k as 1 unit → (n−k+1)! × k! ways", "Never together (linear) — Total arrangements − Always together arrangements", "Always together (circular) — (n−k)! × k! ways", "Identical items — n items with p alike, q alike, r alike → n! / (p! × q! × r!)", "Distribute n into r groups — n distinct items into r distinct groups = r^n", "Select r from n (with rep) — n^r [repetition allowed]", "Rank of a word — Find letters smaller than 1st letter × (n−1)! + rank of remaining word. Repeat recursively.", "Handshakes — n people, each shakes hand once each → nC2 = n(n−1)/2", "Diagonals in polygon — nC2 − n = n(n−3)/2", "TRICK: Perm vs Combo trick — If ORDER matters (e.g. arrange, rank, code) → Permutation. If ORDER doesn't matter (select, choose, committee) → Combination.", "WHEN: WHEN circular arrangement — Sitting around a round table, standing in a circle → always (n−1)!", "WHEN: WHEN necklace formula — Beads on a chain / necklace → divide circular by 2 (clockwise = anticlockwise)"],
    "Simple & Compound Interest":["Simple Interest (SI) — SI = (P × R × T) / 100 (P=Principal, R=Rate%, T=Time in years)", "Amount (SI) — A = P + SI = P × (1 + RT/100)", "Principal from SI — P = (SI × 100) / (R × T)", "Rate from SI — R = (SI × 100) / (P × T)", "Time from SI — T = (SI × 100) / (P × R)", "Compound Interest — A = P × (1 + R/100)^T | CI = A − P", "CI compounded half-yearly — A = P × (1 + R/200)^(2T) [R halved, T doubled]", "CI compounded quarterly — A = P × (1 + R/400)^(4T) [R/4, T×4]", "CI for 2 years (quick) — CI = P × [2R/100 + (R/100)^2] = SI + P(R/100)^2", "Difference CI − SI (2 yr) — CI − SI = P × (R/100)^2", "Difference CI − SI (3 yr) — CI − SI = P × (R/100)^2 × (R/100 + 3)", "Effective annual rate — When compounded k times/year: Effective rate = (1 + R/(100k))^k − 1 × 100", "TRICK: Rule of 72 (doubling) — Years to double at R% ≈ 72 / R (quick mental estimate)", "TRICK: SI vs CI trap — For same P, R, T → CI > SI always (except T=1 year when they are equal)", "WHEN: WHEN CI formula — Bank deposits, population growth, depreciation → always compound interest unless stated 'simple'", "WHEN: WHEN SI formula — Loans for short period, exam problems stating 'simple interest' clearly"],
    "Number System":["Divisibility by 2 — Last digit is 0, 2, 4, 6, or 8", "Divisibility by 3 — Sum of digits is divisible by 3", "Divisibility by 4 — Last two digits divisible by 4", "Divisibility by 5 — Last digit is 0 or 5", "Divisibility by 6 — Divisible by both 2 AND 3", "Divisibility by 7 — Double last digit, subtract from rest. If result divisible by 7 → yes", "Divisibility by 8 — Last three digits divisible by 8", "Divisibility by 9 — Sum of all digits divisible by 9", "Divisibility by 11 — Alternating sum (odd positions − even positions) divisible by 11", "HCF (GCD) — Largest number dividing all given numbers. HCF × LCM = Product of two numbers (for 2 numbers)", "LCM — Smallest number divisible by all given numbers.", "HCF × LCM — HCF(a,b) × LCM(a,b) = a × b [only for exactly 2 numbers]", "Sum of n natural numbers — 1+2+3+…+n = n(n+1)/2", "Sum of n odd numbers — 1+3+5+…+(2n−1) = n^2", "Sum of n even numbers — 2+4+6+…+2n = n(n+1)", "Sum of squares — 1^2+2^2+…+n^2 = n(n+1)(2n+1)/6", "Sum of cubes — 1^3+2^3+…+n^3 = [n(n+1)/2]^2", "Remainder theorem — If f(x) divided by (x−a), remainder = f(a)", "Factors of n — Write n = p^a × q^b × r^c … | Total factors = (a+1)(b+1)(c+1)…", "TRICK: Unit digit cycle — 2:2,4,8,6 | 3:3,9,7,1 | 4:4,6,4,6 | 7:7,9,3,1 | 8:8,4,2,6 | 9:9,1,9,1 (cycle of 4)", "WHEN: WHEN HCF — Find largest tile/container/piece that fits exactly — use HCF", "WHEN: WHEN LCM — Find when events repeat together / smallest common multiple — use LCM"],
    "Algebra & Equations":["Quadratic formula — x = [−b ± sqrt(b^2 − 4ac)] / 2a for ax^2 + bx + c = 0", "Sum of roots — Sum of roots (alpha + beta) = −b/a", "Product of roots — Product of roots (alpha × beta) = c/a", "Discriminant — D = b^2 − 4ac. If D>0: 2 real roots. D=0: equal roots. D<0: no real roots", "(a+b)^2 — a^2 + 2ab + b^2", "(a−b)^2 — a^2 − 2ab + b^2", "(a+b)^3 — a^3 + 3a^2b + 3ab^2 + b^3 = a^3 + b^3 + 3ab(a+b)", "(a−b)^3 — a^3 − 3a^2b + 3ab^2 − b^3 = a^3 − b^3 − 3ab(a−b)", "a^2 − b^2 — (a+b)(a−b)", "a^3 + b^3 — (a+b)(a^2 − ab + b^2)", "a^3 − b^3 — (a−b)(a^2 + ab + b^2)", "a^3+b^3+c^3−3abc — (a+b+c)(a^2+b^2+c^2−ab−bc−ca) | If a+b+c=0 then a^3+b^3+c^3 = 3abc", "(a+b+c)^2 — a^2+b^2+c^2 + 2(ab+bc+ca)", "Linear equations (2 var) — Substitution or elimination method. If a1/a2 = b1/b2 ≠ c1/c2 → no solution (parallel lines)", "WHEN: WHEN quadratic — Finding age, numbers, or values where product and sum both given → form ax^2+bx+c=0", "WHEN: WHEN identity shortcut — Calculation with large numbers — identify algebraic identity to simplify mentally"],
    "Geometry & Mensuration":["Triangle — Area — Area = (1/2) × base × height | Heron's: sqrt[s(s−a)(s−b)(s−c)] where s=(a+b+c)/2", "Equilateral triangle — Area = (sqrt(3)/4) × a^2 | Height = (sqrt(3)/2) × a", "Right triangle — Pythagoras: a^2 + b^2 = c^2 (c=hypotenuse). Common triples: 3,4,5 | 5,12,13 | 8,15,17", "Rectangle — Area = l × b | Perimeter = 2(l + b) | Diagonal = sqrt(l^2 + b^2)", "Square — Area = a^2 | Perimeter = 4a | Diagonal = a × sqrt(2)", "Circle — Area = pi × r^2 | Circumference = 2 × pi × r | Diameter = 2r", "Semi-circle — Area = (1/2) × pi × r^2 | Perimeter = pi × r + 2r", "Sector of circle — Area = (theta/360) × pi × r^2 | Arc length = (theta/360) × 2 × pi × r", "Trapezium — Area = (1/2) × (sum of parallel sides) × height = (1/2)(a+b) × h", "Parallelogram — Area = base × height = b × h | Perimeter = 2(a+b)", "Rhombus — Area = (1/2) × d1 × d2 (d1,d2 = diagonals) | Perimeter = 4a", "Cuboid (box) — Volume = l×b×h | TSA = 2(lb+bh+hl) | LSA = 2h(l+b) | Diagonal=sqrt(l^2+b^2+h^2)", "Cube — Volume = a^3 | TSA = 6a^2 | LSA = 4a^2 | Diagonal = a × sqrt(3)", "Cylinder — Volume = pi×r^2×h | CSA = 2×pi×r×h | TSA = 2×pi×r×(r+h)", "Cone — Volume = (1/3)×pi×r^2×h | CSA = pi×r×l | TSA = pi×r×(r+l) where l=slant height=sqrt(r^2+h^2)", "Sphere — Volume = (4/3)×pi×r^3 | Surface area = 4×pi×r^2", "Hemisphere — Volume = (2/3)×pi×r^3 | CSA = 2×pi×r^2 | TSA = 3×pi×r^2", "TRICK: Pi value — pi = 22/7 = 3.14159… Use 22/7 for fraction answers, 3.14 for decimal", "WHEN: WHEN to use Heron's — All 3 sides of triangle given but height unknown → use Heron's formula", "WHEN: WHEN sector formula — Area cut out of pizza/pie/circle → use sector formula with given angle theta"],
    "Logical Reasoning — Formulas & Patterns":["Number series — AP — nth term of AP = a + (n−1)d | Sum = n/2 × [2a + (n−1)d]", "Number series — GP — nth term of GP = a × r^(n−1) | Sum = a(r^n − 1)/(r−1) for r≠1", "Common differences — If 2nd diff is constant → quadratic series. If 3rd diff constant → cubic series.", "Blood relations — Key: Father's brother = Uncle. Mother's sister = Aunt. Spouse's parent = In-law. Child of sibling = Nephew/Niece", "Coding: letter shift — If A=1,B=2…Z=26 → add/subtract shift value. Or find mirror: A↔Z, B↔Y (26+1=27, so N's mirror = 27−N)", "Direction sense — After all moves, use Pythagoras for straight-line distance. Track turns: Right=clockwise, Left=anticlockwise", "Clock — angle between hands — Angle = |30H − (11/2)M| where H=hours, M=minutes. If >180, subtract from 360.", "Clock — hands overlap — Hands coincide every 65 and 5/11 minutes. In 12 hrs: 11 times (not 12!)", "Syllogism — All A are B + All B are C → All A are C. Some A are B + All B are C → Some A are C", "Venn Diagrams — A union B = A + B − A intersect B | Only A = A − (A intersect B)", "Calendar — day find — Odd days: Jan=3,Feb=0(28days),Mar=3,Apr=2,May=3,Jun=2,Jul=3,Aug=3,Se p=2,Oct=3,Nov=2,Dec=3", "Leap year rule — Divisible by 4 = leap year. Century year: must be divisible by 400 (e.g. 2000 yes, 1900 no)", "TRICK: Clock angle trick — At X:Y0, angle = |30X − 5.5Y|. At 3:00 = 90 deg. At 6:00 = 180 deg. At 12:00 = 0 deg.", "WHEN: WHEN AP/GP series — If differences grow by addition → AP. If multiplied → GP. If alternating → split odd/even terms"],
    "Speed Calculation Tricks":["TRICK: Multiply by 5 — Divide by 2, multiply by 10. e.g. 138 × 5 = 69 × 10 = 690", "TRICK: Multiply by 25 — Divide by 4, multiply by 100. e.g. 48 × 25 = 12 × 100 = 1200", "TRICK: Multiply by 125 — Divide by 8, multiply by 1000. e.g. 56 × 125 = 7 × 1000 = 7000", "TRICK: Square ending in 5 — (a5)^2 = a(a+1) followed by 25. e.g. 65^2 = 6×7 | 25 = 4225", "TRICK: Square near 50 — (50±n)^2 = (2500 ± 100n) + n^2. e.g. 53^2 = 2500+300+9 = 2809", "TRICK: Square near 100 — (100±n)^2 = (10000 ± 200n) + n^2. e.g. 97^2 = 10000−600+9 = 9409", "TRICK: (a^2 − b^2) factoring — Use (a+b)(a−b). e.g. 57^2−43^2 = (100)(14) = 1400", "TRICK: Fraction ↔ % — Memorise: 1/2=50, 1/3=33.3, 1/4=25, 1/5=20, 1/6=16.7, 1/7=14.3, 1/8=12.5, 3/4=75, 2/3=66.7", "TRICK: Quick % check — x% of y = y% of x. So 8% of 75 = 75% of 8 = 6. Always pick the easier calculation.", "TRICK: Vedic: base method — Multiply near 100: (a×b) = (a+b−100) | (100−a)(100−b). e.g. 97×98 = 95|06 = 9506", "TRICK: Casting out nines — To verify multiplication: reduce each number to digit sum, multiply, compare with answer's digit sum 17. KEY INTERVIEW TOPICS — TECHNICAL + HR", "Topic — Must-Know Concepts — Common Questions", "Data Structures — Array, Linked List, Stack, Queue, Tree, Graph, — Reverse LL, detect cycle, BFS/DFS, balanced", "Heap, Hash Table — operations & use cases — brackets, LRU cache", "Algorithms — Sorting (Bubble,Merge,Quick,Heap), Searching — Time/space complexity of sorts, knapsack,", "(Binary), Divide & Conquer, Greedy, DP, — coin change, longest subsequence Backtracking", "Time Complexity — O(1) O(log n) O(n) O(n log n) O(n^2) — Big O, Big — What is time complexity of binary search?", "Omega, Big Theta notation — Quick sort worst case?", "OOP Concepts — Encapsulation, Inheritance, Polymorphism — Explain SOLID principles. Difference:", "(compile/runtime), Abstraction, Interface vs — overloading vs overriding Abstract class", "DBMS / SQL — Normalization 1NF-3NF-BCNF, JOINs — Write a query for 2nd highest salary.", "(INNER/LEFT/RIGHT/FULL/CROSS), Indexing, — Difference: WHERE vs HAVING. What is a", "ACID, Transactions, Triggers — deadlock in DB?", "OS Concepts — Process vs Thread, Deadlock (4 conditions), — What is thrashing? Banker's algorithm.", "Scheduling (FCFS,SJF,Round Robin), Paging, — Difference: mutex vs semaphore Virtual Memory", "Computer — OSI 7-layer model, TCP vs UDP, HTTP/HTTPS, — What happens when you type a URL?", "Networks — DNS, IP addressing, Subnetting, 3-way handshake — Difference: TCP vs UDP. What is HTTPS?", "System Design — Scalability, Load balancing, Caching (Redis), CDN, — Design URL shortener / parking lot / rate", "Microservices, REST vs GraphQL, CAP theorem — limiter. Horizontal vs vertical scaling.", "HR Questions — Self-introduction, Strengths/Weaknesses, STAR — Tell me about yourself. Describe a challenge", "method for behavioral, Why this company, 5-year — you overcame. Why should we hire you? plan 18. IMPORTANT RESOURCES & LINKS", "Platform — Link — Best For", "IndiaBIX — www.indiabix.com — Aptitude Q&A; with detailed solutions — topic-wise", "GeeksForGeeks — www.geeksforgeeks.org/aptitude — Aptitude + CS fundamentals + coding", "PrepInsta — www.prepinsta.com — Company-specific placement papers (TCS,Infosys,Wipro…)", "Hitbullseye — www.hitbullseye.com — Aptitude mock tests + sectional tests", "LeetCode — www.leetcode.com — Coding DSA problems (Easy to Hard)", "HackerRank — www.hackerrank.com — Practice + certification in Python, SQL, algorithms", "TestBook — www.testbook.com — Full-length mock aptitude tests with analytics", "Khan Academy — www.khanacademy.org — Free math foundations — percentages, algebra, geometry", "Brilliant.org — www.brilliant.org — Interactive math & logic puzzles", "YouTube: Arun Sharma — Search: 'Arun Sharma Aptitude Tricks' — Best video shortcuts for all aptitude topics", "YouTube: CareerRide — www.youtube.com/@CareerRide — Placement aptitude + interview videos", "R.S. Aggarwal Book — Available: Amazon / Flipkart — Classic aptitude textbook — MUST HAVE for placements", "M. Tyra: Magical Book — Available: Amazon / local bookstore — Speed maths tricks — highly recommended", "InterviewBit — www.interviewbit.com — DSA + system design prep for tech interviews 19. 4-WEEK PLACEMENT PREP PLAN", "Week — Topics — Daily Goal — Resources", "Week 1 — Percentage, Ratio, Average, — Learn formulas, solve 30 Qs/topic on — IndiaBIX + R.S. Aggarwal", "Profit & Loss — IndiaBIX — Ch.1–8", "Week 2 — Time-Work, Pipes & Cistern, — Apply LCM method, 1 timed mock test — PrepInsta + Hitbullseye", "TSD, Trains — (30 min) — sectional tests", "Week 3 — Probability, PnC, SI/CI, Number — 30 Qs/day, note all tricky Qs, review — GeeksForGeeks + TestBook", "System, Geometry — formulas — mock tests", "Week 4 — Full revision + Company-specific — 2 full mocks/day, target 80%+ accuracy, — PrepInsta company papers +", "papers + Coding — LeetCode Easy — LeetCode PURPLE = When to Use Practise daily. Accuracy > Speed. Good luck! ■"]
  }
  Logical:["Number series","Letter series","Alphanumeric series","Coding-decoding","Blood relations","Direction sense","Syllogisms","Seating arrangement","Linear arrangement","Circular arrangement","Puzzles","Data sufficiency","Statement & conclusion","Statement & assumption","Cause & effect","Assertion & reason","Analogy","Classification","Venn diagrams","Ranking & order","Calendar","Clock reasoning","Input-output","Non-verbal patterns","Logical sequence"],
  Verbal:["Reading comprehension","Vocabulary","Synonyms & antonyms","Sentence completion","Para jumbles","Sentence rearrangement","Fill in the blanks","Error spotting","Sentence correction","Active & passive voice","Direct & indirect speech","Tenses","Articles","Prepositions","Conjunctions","Subject-verb agreement","Pronouns","Modifiers","Idioms & phrases","One-word substitution","Contextual vocabulary","Cloze test","Inference questions","Tone of passage","Summary questions"],
  Critical:["Assumption identification","Conclusion identification","Inference","Strengthen an argument","Weaken an argument","Cause vs correlation","Cause and effect","Statement–argument","Statement–assumption","Statement–conclusion","Course of action","Decision making","Data sufficiency","Evidence evaluation","Fact vs opinion","Necessary vs sufficient condition","Counterexample testing","Alternative explanation","Bias detection","Source reliability","Consistency check","Trend interpretation","Risk–benefit analysis","Constraint analysis","Root-cause reasoning"]
};

const heuristicTechniques=[
  ["Percentage base rule","Always identify the original/base value before calculating a percentage change.","If price changes 100→120, increase is 20/100=20%, not 20/120."],
  ["Successive percentage rule","For successive changes a% and b%, net change=a+b+ab/100 using signs.","+20%, then −10% ⇒ 20−10−2=8% increase."],
  ["Fraction-to-percent anchors","Remember 1/2=50%, 1/3≈33.33%, 1/4=25%, 1/5=20%, 1/8=12.5%, 1/10=10%.","25% of 640 = 640/4 = 160."],
  ["Profit percent base","Profit% is always on CP unless the question says otherwise.","CP=500, SP=600 ⇒ profit%=100/500×100=20%."],
  ["Discount base","Discount% is always on marked price.","MP=1000, discount=15% ⇒ SP=850."],
  ["Ratio as parts","For a:b, total parts=a+b; one part=total/(a+b).","Divide 360 in 2:3 ⇒ one part=72, values=144 and 216."],
  ["Average deviation","Average can be updated using total change instead of recalculating every value.","Average of 10 is 50; replace 40 by 70 ⇒ new average=53."],
  ["Equal-distance speed shortcut","For equal distances, average speed=2ab/(a+b), never simple average.","30 and 60 km/h ⇒ 40 km/h."],
  ["Relative-speed rule","Same direction subtract; opposite direction add.","60 and 40 opposite ⇒ closing speed=100."],
  ["Train crossing rule","Pole: train length/speed. Platform: train+platform length/speed.","120 m train at 10 m/s crosses pole in 12 s."],
  ["Work-rate method","Convert every worker into a fraction of work per day.","A=10 days ⇒ rate=1/10; B=15 ⇒ 1/15; together=1/6."],
  ["Efficiency-time inverse","More efficient means less time in inverse proportion.","A:B efficiency=3:2 ⇒ time A:B=2:3."],
  ["Man-days invariant","For identical work, people×days×hours×efficiency stays proportional.","Double workers with same efficiency roughly halves days."],
  ["Alligation cross-difference","Mean lies between cheaper and dearer; use cross differences for quantity ratio.","₹20 and ₹40 mixed to ₹30 ⇒ 1:1."],
  ["HCF-LCM product","For two positive integers, HCF×LCM=product.","HCF 6 and LCM 60 ⇒ product=360."],
  ["Divisibility 3/9","Digit sum determines divisibility by 3 and 9.","729: 7+2+9=18 ⇒ divisible by both."],
  ["Divisibility 11","Difference of alternating digit sums is 0 or a multiple of 11.","121: (1+1)−2=0."],
  ["AP term shortcut","a_n=a+(n−1)d.","AP 5,8,11: 20th term=5+19×3=62."],
  ["Complement probability","At least one = 1−none.","At least one six in two rolls=1−(5/6)^2=11/36."],
  ["Combination symmetry","nCr=nC(n−r); choose the smaller r for easier calculation.","20C18=20C2=190."],
  ["Permutation vs combination","Order matters → permutation; order does not matter → combination.","Captain/vice-captain uses permutation; selecting 2 team members uses combination."],
  ["Unit normalization","Convert all quantities to one unit before formula substitution.","72 km/h=20 m/s before using distance/time."],
  ["Options-first approximation","If options are far apart, estimate before exact calculation.","Use 3.14≈π when exact π is unnecessary."],
  ["Ratio scaling","Multiply or divide every ratio term by the same non-zero factor.","4:6 simplifies to 2:3."],
  ["Algebra factorization","Look for common factors and identities before applying quadratic formula.","x²−9=(x−3)(x+3)."],
  ["Clock angle formula","Use |30H−5.5M| and reduce to the smaller angle if needed.","3:00 ⇒ 90°."],
  ["Pipeline signed-rate rule","Filling pipes are positive rates; emptying pipes are negative rates.","1/6+1/12−1/4=−1/12 means net emptying."],
  ["Data-sufficiency discipline","Do not solve the full problem if the question only asks whether data are sufficient.","Check statement I, II, both, either, neither according to the given options."],
  ["Syllogism set rule","Translate statements into sets; do not assume a relationship not explicitly guaranteed.","All A are B does not mean all B are A."],
  ["Critical-argument rule","Separate evidence, assumption and conclusion before judging an argument.","A conclusion can be plausible yet unsupported if its key assumption is missing."]
];

const advancedExamples=[
  {topic:"Successive percentage",q:"A salary increases by 20% and then decreases by 10%. Find the net change.",steps:["Take original as 100.","After +20% → 120.","After −10% → 108.","Net = +8%."],answer:"8% increase"},
  {topic:"Profit & discount",q:"An article costs ₹800. It is marked 25% above CP and sold at 10% discount. Find profit%.",steps:["MP=800×1.25=₹1000.","SP=1000×0.90=₹900.","Profit=900−800=₹100.","Profit%=100/800×100=12.5%."],answer:"12.5% profit"},
  {topic:"Average",q:"Average of 8 numbers is 24. One number 18 is replaced by 34. New average?",steps:["Old total=8×24=192.","New total=192−18+34=208.","New average=208/8."],answer:"26"},
  {topic:"Time & work",q:"A finishes a job in 12 days and B in 18 days. How long together?",steps:["A rate=1/12.","B rate=1/18.","Together=3/36+2/36=5/36.","Time=36/5 days."],answer:"7.2 days"},
  {topic:"Speed",q:"A car travels equal distances at 40 and 60 km/h. Find average speed.",steps:["Use equal-distance shortcut 2ab/(a+b).","=2×40×60/100."],answer:"48 km/h"},
  {topic:"Probability",q:"What is the probability of getting at least one head in three fair coin tosses?",steps:["Use complement.","P(no head)=P(TTT)=(1/2)^3=1/8.","At least one=1−1/8."],answer:"7/8"},
  {topic:"Permutation",q:"How many ways can 5 different books be arranged on a shelf?",steps:["All positions are distinct and order matters.","Use 5!."],answer:"120"},
  {topic:"Combination",q:"Choose 3 students from 8. How many groups?",steps:["Order does not matter.","Use 8C3=8!/(3!5!)."],answer:"56"},
  {topic:"Ratio",q:"Divide ₹840 in the ratio 3:4:5.",steps:["Total parts=12.","One part=840/12=70.","Shares=210, 280, 350."],answer:"₹210, ₹280, ₹350"},
  {topic:"Alligation",q:"Mix ₹20/kg and ₹50/kg rice to get ₹30/kg. Find ratio.",steps:["Difference from mean: dearer−mean=20; mean−cheaper=10.","Cheaper:dearer=20:10."],answer:"2:1"},
  {topic:"Number system",q:"Find the HCF of 84 and 126.",steps:["84=2²×3×7; 126=2×3²×7.","Take common lowest powers: 2×3×7."],answer:"42"},
  {topic:"Clock",q:"Find the angle between hands at 3:30.",steps:["Use |30H−5.5M|.","|90−165|=75°."],answer:"75°"}
];

const tenseTable=[
  ["Simple Present","Subject + V1/V1+s(es)","am/is/are + V3","She writes a report. → A report is written by her."],
  ["Present Continuous","am/is/are + V-ing","am/is/are being + V3","She is writing a report. → A report is being written by her."],
  ["Present Perfect","has/have + V3","has/have been + V3","She has written a report. → A report has been written by her."],
  ["Present Perfect Continuous","has/have been + V-ing","Generally not used in standard passive","She has been writing for two hours. → Usually keep active or rewrite the sentence."],
  ["Simple Past","V2","was/were + V3","She wrote a report. → A report was written by her."],
  ["Past Continuous","was/were + V-ing","was/were being + V3","She was writing a report. → A report was being written by her."],
  ["Past Perfect","had + V3","had been + V3","She had written a report. → A report had been written by her."],
  ["Past Perfect Continuous","had been + V-ing","Generally not used in standard passive","She had been writing for hours. → Usually rewrite instead of forcing a passive form."],
  ["Simple Future","will + V1","will be + V3","She will write a report. → A report will be written by her."],
  ["Future Continuous","will be + V-ing","Rare/awkward in passive","She will be writing a report. → Prefer a natural active or alternative passive construction."],
  ["Future Perfect","will have + V3","will have been + V3","She will have written a report. → A report will have been written by her."],
  ["Modal","modal + V1","modal + be + V3","She can write a report. → A report can be written by her."]
];

const errorRules=["Subject and verb must agree in number.","Check tense consistency within the sentence.","Use a/an based on sound, not spelling.","Use the correct preposition for time, place and movement.","Pronouns must agree with their antecedents.","Avoid double comparatives: more better, most fastest.","Check parallel structure in lists and comparisons.","Use fewer for countable nouns and less for uncountable nouns in formal usage.","Place modifiers next to the word they describe.","Avoid unnecessary articles with proper names/general plural nouns where not required.","Use singular indefinite pronouns with singular verbs in formal exam grammar.","Check subject–verb agreement after phrases such as as well as, along with and together with."];


const codingTopics = {
  "Data Structures": ["Arrays","Strings","Linked Lists","Stacks","Queues","Hashing (HashMap, HashSet)","Trees","Binary Trees","Binary Search Trees (BST)","Heaps (Priority Queue)","Graphs","Tries"],
  "Coding Techniques": ["Kadane's Algorithm","Monotonic Stack","Monotonic Queue","Merge Intervals","Brute Force","Two Pointers","Sliding Window","Fast and Slow Pointers","Recursion","Searching Algorithms","Sorting Algorithms","Backtracking","Divide and Conquer","Greedy Algorithms","Bit Manipulation","Dynamic Programming (DP)"]
};
const codingTag = {
  "Arrays":"array","Strings":"string","Linked Lists":"linked-list","Stacks":"stack","Queues":"queue","Hashing (HashMap, HashSet)":"hash-table","Trees":"tree","Binary Trees":"binary-tree","Binary Search Trees (BST)":"binary-search-tree","Heaps (Priority Queue)":"heap-priority-queue","Graphs":"graph","Tries":"trie",
  "Kadane's Algorithm":"dynamic-programming","Monotonic Stack":"stack","Monotonic Queue":"queue","Merge Intervals":"sorting","Brute Force":"array","Two Pointers":"two-pointers","Sliding Window":"sliding-window","Fast and Slow Pointers":"two-pointers","Recursion":"recursion","Searching Algorithms":"binary-search","Sorting Algorithms":"sorting","Backtracking":"backtracking","Divide and Conquer":"divide-and-conquer","Greedy Algorithms":"greedy","Bit Manipulation":"bit-manipulation","Dynamic Programming (DP)":"dynamic-programming"
};
const codingProblemPools = {
  arrays: [
    ["Two Sum","two-sum"],["Best Time to Buy and Sell Stock","best-time-to-buy-and-sell-stock"],["Contains Duplicate","contains-duplicate"],["Product of Array Except Self","product-of-array-except-self"],["Maximum Subarray","maximum-subarray"],["Maximum Product Subarray","maximum-product-subarray"],["Find Minimum in Rotated Sorted Array","find-minimum-in-rotated-sorted-array"],["Search in Rotated Sorted Array","search-in-rotated-sorted-array"],["3Sum","3sum"],["Container With Most Water","container-with-most-water"],["Trapping Rain Water","trapping-rain-water"],["Rotate Array","rotate-array"],["Merge Sorted Array","merge-sorted-array"],["Remove Duplicates from Sorted Array","remove-duplicates-from-sorted-array"],["Move Zeroes","move-zeroes"],["Missing Number","missing-number"],["Find the Duplicate Number","find-the-duplicate-number"],["Subarray Sum Equals K","subarray-sum-equals-k"],["Longest Consecutive Sequence","longest-consecutive-sequence"],["First Missing Positive","first-missing-positive"]
  ],
  strings: [
    ["Valid Anagram","valid-anagram"],["Valid Palindrome","valid-palindrome"],["Longest Common Prefix","longest-common-prefix"],["Find the Index of the First Occurrence in a String","find-the-index-of-the-first-occurrence-in-a-string"],["Reverse String","reverse-string"],["Reverse Words in a String","reverse-words-in-a-string"],["Longest Substring Without Repeating Characters","longest-substring-without-repeating-characters"],["Longest Palindromic Substring","longest-palindromic-substring"],["Palindromic Substrings","palindromic-substrings"],["Group Anagrams","group-anagrams"],["String to Integer (atoi)","string-to-integer-atoi"],["Is Subsequence","is-subsequence"],["Minimum Window Substring","minimum-window-substring"],["Decode String","decode-string"],["Encode and Decode Strings","encode-and-decode-strings"],["Valid Parentheses","valid-parentheses"],["Roman to Integer","roman-to-integer"],["Integer to Roman","integer-to-roman"],["Add Strings","add-strings"],["Multiply Strings","multiply-strings"]
  ],
  linked: [
    ["Reverse Linked List","reverse-linked-list"],["Merge Two Sorted Lists","merge-two-sorted-lists"],["Linked List Cycle","linked-list-cycle"],["Remove Nth Node From End of List","remove-nth-node-from-end-of-list"],["Reorder List","reorder-list"],["Middle of the Linked List","middle-of-the-linked-list"],["Palindrome Linked List","palindrome-linked-list"],["Intersection of Two Linked Lists","intersection-of-two-linked-lists"],["Add Two Numbers","add-two-numbers"],["Copy List with Random Pointer","copy-list-with-random-pointer"],["Reverse Linked List II","reverse-linked-list-ii"],["Swap Nodes in Pairs","swap-nodes-in-pairs"],["Rotate List","rotate-list"],["Partition List","partition-list"],["Remove Duplicates from Sorted List","remove-duplicates-from-sorted-list"],["Merge k Sorted Lists","merge-k-sorted-lists"],["Flatten a Multilevel Doubly Linked List","flatten-a-multilevel-doubly-linked-list"],["Design Linked List","design-linked-list"],["LRU Cache","lru-cache"],["Sort List","sort-list"]
  ],
  stack: [
    ["Valid Parentheses","valid-parentheses"],["Min Stack","min-stack"],["Evaluate Reverse Polish Notation","evaluate-reverse-polish-notation"],["Generate Parentheses","generate-parentheses"],["Daily Temperatures","daily-temperatures"],["Next Greater Element I","next-greater-element-i"],["Largest Rectangle in Histogram","largest-rectangle-in-histogram"],["Car Fleet","car-fleet"],["Asteroid Collision","asteroid-collision"],["Remove K Digits","remove-k-digits"],["Basic Calculator","basic-calculator"],["Basic Calculator II","basic-calculator-ii"],["Simplify Path","simplify-path"],["Decode String","decode-string"],["Online Stock Span","online-stock-span"],["132 Pattern","132-pattern"],["Trapping Rain Water","trapping-rain-water"],["Maximal Rectangle","maximal-rectangle"],["Remove Duplicate Letters","remove-duplicate-letters"],["Maximum Frequency Stack","maximum-frequency-stack"]
  ],
  trees: [
    ["Maximum Depth of Binary Tree","maximum-depth-of-binary-tree"],["Invert Binary Tree","invert-binary-tree"],["Same Tree","same-tree"],["Subtree of Another Tree","subtree-of-another-tree"],["Diameter of Binary Tree","diameter-of-binary-tree"],["Balanced Binary Tree","balanced-binary-tree"],["Binary Tree Level Order Traversal","binary-tree-level-order-traversal"],["Binary Tree Right Side View","binary-tree-right-side-view"],["Lowest Common Ancestor of a Binary Tree","lowest-common-ancestor-of-a-binary-tree"],["Validate Binary Search Tree","validate-binary-search-tree"],["Kth Smallest Element in a BST","kth-smallest-element-in-a-bst"],["Construct Binary Tree from Preorder and Inorder Traversal","construct-binary-tree-from-preorder-and-inorder-traversal"],["Binary Tree Maximum Path Sum","binary-tree-maximum-path-sum"],["Serialize and Deserialize Binary Tree","serialize-and-deserialize-binary-tree"],["Path Sum","path-sum"],["Path Sum II","path-sum-ii"],["Count Good Nodes in Binary Tree","count-good-nodes-in-binary-tree"],["Unique Binary Search Trees","unique-binary-search-trees"],["Recover Binary Search Tree","recover-binary-search-tree"],["Delete Node in a BST","delete-node-in-a-bst"]
  ],
  graph: [
    ["Number of Islands","number-of-islands"],["Clone Graph","clone-graph"],["Max Area of Island","max-area-of-island"],["Pacific Atlantic Water Flow","pacific-atlantic-water-flow"],["Course Schedule","course-schedule"],["Course Schedule II","course-schedule-ii"],["Graph Valid Tree","graph-valid-tree"],["Number of Connected Components in an Undirected Graph","number-of-connected-components-in-an-undirected-graph"],["Rotting Oranges","rotting-oranges"],["Walls and Gates","walls-and-gates"],["Word Ladder","word-ladder"],["Network Delay Time","network-delay-time"],["Cheapest Flights Within K Stops","cheapest-flights-within-k-stops"],["Reconstruct Itinerary","reconstruct-itinerary"],["Min Cost to Connect All Points","min-cost-to-connect-all-points"],["Redundant Connection","redundant-connection"],["Is Graph Bipartite?","is-graph-bipartite"],["Path With Minimum Effort","path-with-minimum-effort"],["Open the Lock","open-the-lock"],["Evaluate Division","evaluate-division"]
  ],
  dp: [
    ["Climbing Stairs","climbing-stairs"],["House Robber","house-robber"],["House Robber II","house-robber-ii"],["Coin Change","coin-change"],["Longest Increasing Subsequence","longest-increasing-subsequence"],["Longest Common Subsequence","longest-common-subsequence"],["Word Break","word-break"],["Combination Sum IV","combination-sum-iv"],["Unique Paths","unique-paths"],["Decode Ways","decode-ways"],["Maximum Product Subarray","maximum-product-subarray"],["Partition Equal Subset Sum","partition-equal-subset-sum"],["Target Sum","target-sum"],["Edit Distance","edit-distance"],["Regular Expression Matching","regular-expression-matching"],["Interleaving String","interleaving-string"],["Best Time to Buy and Sell Stock with Cooldown","best-time-to-buy-and-sell-stock-with-cooldown"],["Burst Balloons","burst-balloons"],["Maximum Profit in Job Scheduling","maximum-profit-in-job-scheduling"],["Distinct Subsequences","distinct-subsequences"]
  ],
  misc: [
    ["Binary Search","binary-search"],["Search a 2D Matrix","search-a-2d-matrix"],["Koko Eating Bananas","koko-eating-bananas"],["Find Peak Element","find-peak-element"],["Search Insert Position","search-insert-position"],["Sort Colors","sort-colors"],["Merge Intervals","merge-intervals"],["Insert Interval","insert-interval"],["Non-overlapping Intervals","non-overlapping-intervals"],["Meeting Rooms II","meeting-rooms-ii"],["Jump Game","jump-game"],["Jump Game II","jump-game-ii"],["Gas Station","gas-station"],["Partition Labels","partition-labels"],["Single Number","single-number"],["Number of 1 Bits","number-of-1-bits"],["Counting Bits","counting-bits"],["Subsets","subsets"],["Combination Sum","combination-sum"],["Permutations","permutations"]
  ]
};
const codingPoolForTopic = {
  "Arrays":"arrays","Strings":"strings","Linked Lists":"linked","Stacks":"stack","Queues":"stack","Hashing (HashMap, HashSet)":"arrays","Trees":"trees","Binary Trees":"trees","Binary Search Trees (BST)":"trees","Heaps (Priority Queue)":"misc","Graphs":"graph","Tries":"strings",
  "Kadane's Algorithm":"arrays","Monotonic Stack":"stack","Monotonic Queue":"stack","Merge Intervals":"misc","Brute Force":"arrays","Two Pointers":"arrays","Sliding Window":"strings","Fast and Slow Pointers":"linked","Recursion":"trees","Searching Algorithms":"misc","Sorting Algorithms":"misc","Backtracking":"misc","Divide and Conquer":"misc","Greedy Algorithms":"misc","Bit Manipulation":"misc","Dynamic Programming (DP)":"dp"
};
function CodingPractice({userId}){
  const progressStorageKey=`interviewai_coding_done_${userId}`;
  const [group,setGroup]=useState("Data Structures");
  const [topic,setTopic]=useState("Arrays");
  const [filter,setFilter]=useState("All");
  const [completed,setCompleted]=useState(()=>{try{return JSON.parse(localStorage.getItem(progressStorageKey)||"{}")}catch{return {}}});
  const topics=codingTopics[group];
  const activeTopic=topics.includes(topic)?topic:topics[0];
  const key=(i)=>`${group}:${activeTopic}:${i}`;
  const toggle=(i)=>setCompleted(old=>{const next={...old,[key(i)]:!old[key(i)]};localStorage.setItem(progressStorageKey,JSON.stringify(next));return next;});
  const problems=(codingProblemPools[codingPoolForTopic[activeTopic]]||codingProblemPools.arrays).map(([title,slug],i)=>({i,title,slug,level:i<7?"Easy":i<14?"Medium":"Hard"}));
  const shown=filter==="All"?problems:problems.filter(p=>p.level===filter);
  const done=problems.filter(p=>completed[key(p.i)]).length;
  return <main className="page codingPage">
    <div className="eyebrow">💻 CODING PRACTICE</div><h2>Data Structures & Coding Techniques</h2>
    <p>Choose a track and topic. Each topic lists 20 named LeetCode problems in Easy → Medium → Hard order. Open a problem directly on LeetCode and mark it complete to track progress.</p>
    <div className="codingGroupTabs">{Object.keys(codingTopics).map(g=><button key={g} className={group===g?"selected":""} onClick={()=>{setGroup(g);setTopic(codingTopics[g][0]);setFilter("All")}}>{g}</button>)}</div>
    <div className="codingLayout"><aside className="codingSidebar"><h3>{group}</h3>{topics.map(t=><button key={t} className={activeTopic===t?"selected":""} onClick={()=>{setTopic(t);setFilter("All")}}>{t}<span>{(codingProblemPools[codingPoolForTopic[t]]||codingProblemPools.arrays).filter((_,i)=>completed[`${group}:${t}:${i}`]).length}/20</span></button>)}</aside>
    <section className="codingContent"><div className="codingTop"><div><span className="eyebrow">SELECTED TOPIC</span><h3>{activeTopic}</h3><p>{done} of 20 completed</p></div></div>
    <div className="codingProgress"><i style={{width:`${done*5}%`}}/></div>
    <div className="codingFilters">{["All","Easy","Medium","Hard"].map(x=><button key={x} className={filter===x?"selected":""} onClick={()=>setFilter(x)}>{x}</button>)}</div>
    <div className="codingProblemList">{shown.map(p=><article className={`codingProblem ${completed[key(p.i)]?"isDone":""}`} key={p.i}><div className="codingProblemNum">{String(p.i+1).padStart(2,"0")}</div><div className="codingProblemBody"><div className="codingProblemMeta"><span className={`codingLevel ${p.level.toLowerCase()}`}>{p.level}</span>{completed[key(p.i)]&&<span className="codingDoneLabel">✓ Completed</span>}</div><h4>{p.title}</h4><p>Practice this LeetCode problem and analyze the time and space complexity of your solution.</p><div className="codingActions"><button className="markBtn" onClick={()=>toggle(p.i)}>{completed[key(p.i)]?"Mark as incomplete":"Mark as completed"}</button><a href={`https://leetcode.com/problems/${p.slug}/`} target="_blank" rel="noreferrer" className="codingProblemLink">Proceed to LeetCode ↗</a></div></div></article>)}</div>
    <div className="codingFooter"><span>20 problems · 7 Easy · 7 Medium · 6 Hard</span></div>
    </section></div>
  </main>;
}

function Aptitude(){
  const [open,setOpen]=useState(null);
  return <main className="page aptitudePage">
    <div className="eyebrow">HIREMIND · FORMULA LAB</div>
    <h2>Quantitative Aptitude Formulas</h2>
    <p>Select a topic to open its formula reference.</p>
    <section className="aptSection">
      <div className="formulaGrid">
        {Object.entries(aptitudeData.Quantitative).map(([topic,items],idx)=>
          <div className={`formulaCard interactiveCard ${open===idx?"expanded":""}`} key={topic}>
            <button className="cardHeader" onClick={()=>setOpen(open===idx?null:idx)} aria-expanded={open===idx}>
              <h4>{topic}</h4><span>{open===idx?<ChevronDown className="rot" size={18}/>:<ChevronDown size={18}/>}</span>
            </button>
            {open===idx&&<div className="formulaList">{items.map((formula,i)=><div className="formula" key={i}><b>{i+1}.</b> {formula}</div>)}</div>}
          </div>
        )}
      </div>
    </section>
  </main>;
}

function Questions() {
  const [subject,setSubject]=useState("Java"),[qs,setQs]=useState([]),[open,setOpen]=useState(null);
  useEffect(()=>{fetch(`${API}/api/questions/${encodeURIComponent(subject)}`).then(r=>r.json()).then(setQs).catch(()=>setQs([]));},[subject]);
  return <main className="page"><div className="eyebrow">📚 PREPARATION LIBRARY</div><h2>Top 50 Interview Questions</h2><p>Exactly 50 core interview questions for each subject.</p><div className="subjectGroups">{subjectGroups.map(group=><div className="subjectGroup" key={group.title}><h3>{group.title}</h3><div className="subjectTabs">{group.items.map(s=><button key={s} className={subject===s?"selected":""} onClick={()=>{setSubject(s);setOpen(null)}}>{s}</button>)}</div></div>)}</div><div className="questionList">{qs.map(q=><div className="question" key={q.id} onClick={()=>setOpen(open===q.id?null:q.id)}><div><span>#{q.id} · {q.difficulty}</span><h3>{q.question}</h3>{open===q.id&&<p>Prepare a definition, key points, a practical example, and a project connection where appropriate.</p>}</div><ChevronDown className={open===q.id?"rot":""}/></div>)}</div></main>;
}

function HistoryPage({history}) {
  return <main className="page"><div className="eyebrow">🕒 YOUR ACCOUNT</div><h2><History/> Interview History</h2><p>Your previous interview reports are saved to your personal account.</p><div className="historyList">{history.length===0?<div className="panel"><p>No interviews yet.</p></div>:history.map(h=><div className="historyItem" key={h.id}><div><b>{h.type} · {h.difficulty}</b><small>{new Date(h.date).toLocaleString()}</small></div><strong>{h.overallScore}/100</strong></div>)}</div></main>;
}

createRoot(document.getElementById("root")).render(<App/>);
