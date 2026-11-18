import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const authHeader=req.headers.get("Authorization");
 if(!authHeader?.startsWith("Bearer "))return json({error:"Sign in to continue."},401);
 const url=Deno.env.get("SUPABASE_URL")??"",key=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY")??"";
 const anthropicKey=Deno.env.get("ANTHROPIC_API_KEY"),model=Deno.env.get("ANTHROPIC_MODEL")??"claude-sonnet-5-5";
 if(!url||!key)return json({error:"Backend configuration is incomplete."},503);
 if(!anthropicKey)return json({error:"AI provider key is not configured yet. Add ANTHROPIC_API_KEY to this Supabase project's Edge Function secrets."},503);
 const db=createClient(url,key,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:auth,error:authErr}=await db.auth.getUser();
  if(authErr||!auth.user)return json({error:"Your session expired. Please reopen JASVO AI."},401);
  const body=await req.json(),prompt=String(body.prompt??"").trim(),mode=String(body.mode??"chat"),chatId=String(body.chat_id??""),title=String(body.title??"New chat").slice(0,120);
  const attachments=Array.isArray(body.attachments)?body.attachments:[],think=body.think===true;
  if((!prompt&&!attachments.length)||prompt.length>12000)return json({error:"Add a message or an attachment. Messages may contain up to 12,000 characters."},400);
  if(attachments.length>4)return json({error:"Attach up to 4 files per message."},400);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chatId))return json({error:"Invalid chat session."},400);
  if(!["chat","tutor","study","practice","exam"].includes(mode))return json({error:"Invalid mode."},400);
  const {data:prior,error:historyErr}=await db.from("chat_messages").select("role,content").eq("session_id",chatId).order("created_at",{ascending:true}).limit(24);
  if(historyErr)throw historyErr;
  const guidance:Record<string,string>={chat:"Be a helpful, natural general-purpose assistant.",tutor:"Teach step by step, check understanding, and adapt to the learner's level.",study:"Help create clear summaries, revision notes, and flashcards from supplied material.",practice:"Give one exercise at a time and provide constructive feedback after each answer.",exam:"Act as an exam coach. Ask questions, keep score when appropriate, and explain corrections."};
  const content:any[]=[];
  if(prompt)content.push({type:"text",text:prompt});
  const fileLabels:string[]=[];
  for(const item of attachments){
   const name=String(item?.name??"attachment").slice(0,160),kind=String(item?.kind??""),media=String(item?.media_type??""),data=String(item?.data??"");
   fileLabels.push(name);
   if(kind==="image"&&["image/jpeg","image/png","image/gif","image/webp"].includes(media)&&data.length<=7_000_000){content.push({type:"image",source:{type:"base64",media_type:media,data}});}
   else if(kind==="document"&&media==="application/pdf"&&data.length<=7_000_000){content.push({type:"document",source:{type:"base64",media_type:"application/pdf",data}});}
   else if(kind==="text"&&typeof item.text==="string"&&item.text.length<=120000){content.push({type:"text",text:"\n\nAttached file: "+name+"\n"+item.text});}
   else return json({error:"Unsupported or oversized attachment: "+name},400);
  }
  if(!prompt)content.unshift({type:"text",text:"Please analyse the attached file(s)."});
  const messages=[...(prior??[]).map((m:{role:string;content:string})=>({role:m.role,content:m.content})),{role:"user",content}];
  const system="You are JASVO AI, a warm, capable Kenyan-origin AI companion by TERAVEX. Respond naturally in English, Kiswahili, Sheng, or mixed language based on the user's message. Be accurate, clear, and transparent about uncertainty. "+guidance[mode]+(think?" Take extra care to reason through the task, check assumptions, and provide a well-structured answer. Do not reveal private chain-of-thought; provide concise conclusions and useful explanations.":"");
  const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":anthropicKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:1400,system,messages})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){console.error("Anthropic provider error:",response.status,payload?.error?.type??"unknown");return json({error:"The AI provider could not complete this request. Please try again shortly."},502);}
  const reply=(payload?.content??[]).filter((p:{type:string})=>p.type==="text").map((p:{text:string})=>p.text).join("\n").trim();
  if(!reply)return json({error:"JASVO did not receive a usable response. Please try again."},502);
  const savedPrompt=(prompt||"Please analyse the attached file(s).")+(fileLabels.length?"\n\n[Attachments: "+fileLabels.join(", ")+"]":"");
  const {data:count,error:saveErr}=await db.rpc("persist_chat_turn",{p_session_id:chatId,p_title:title,p_mode:mode,p_user_message:savedPrompt,p_assistant_message:reply});
  if(saveErr)return json({error:saveErr.message},saveErr.message?.includes("Daily free message limit")?429:500);
  return json({reply,remaining:Math.max(0,10-Number(count))});
 }catch(error){console.error("jasvo-chat:",error);return json({error:"Something went wrong while processing your message. Please try again."},500);}
});