
(function(){
  "use strict";
  var state = {query:"", mode:"all", genre:"all", sort:"popular", shots:false, favorites:false};
  var saved;
  try { saved = new Set(JSON.parse(localStorage.getItem("coop-finder-saved-v2") || "[]")); }
  catch (_) { saved = new Set(); }
  var grid = document.getElementById("grid");
  var resultCount = document.getElementById("result-count");
  var modalRoot = document.getElementById("modal-root");
  var lastFocus = null;
  var categoryLabels = {all:"全部类型", puzzle:"解谜合作", party:"欢乐乱斗", action:"动作闯关", explore:"冒险探索", other:"其他玩法"};
  function esc(v){return String(v == null ? "" : v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function plain(v){return String(v || "").replace(/\*\*/g,"").trim();}
  function stars(g){return (g.cool.match(/★/g) || []).length;}
  function category(g){
    var t = (g.genre + " " + g.why).toLowerCase();
    if (/解谜|谜题|机关|推理|益智|拼图|反向指令|移动方块|异步/.test(t)) return "puzzle";
    if (/乱斗|混战|派对|搞笑|沙雕|竞速|赛车|对战|抢银行|相扑|击球|节奏|运动会|掷|回旋镖/.test(t)) return "party";
    if (/射击|枪|格斗|横版|战斗|动作|砍|肉鸽|rogue|rpg|arpg|闯关|beat|爆破|刷子|突入/.test(t)) return "action";
    if (/冒险|探索|经营|建造|合作整理|沙盒|生存|防守|剧情|故事|载具|飞船|太空/.test(t)) return "explore";
    return "other";
  }
  function briefPeople(g){
    var p = g.people || "双人";
    var m = p.match(/(?:1|2)\s*[–—-]\s*[3456]\s*人|最多\s*\d+\s*人|\d+\s*人|多人/);
    return m ? m[0].replace(/\s+/g," ") : p.slice(0,12);
  }
  function modeLabel(g){return g.form || "本地游玩";}
  function imgUrl(p){
    if(!p || !/^[-\w./]+$/.test(p) || p.indexOf("..") !== -1) return "";
    return "img/" + p;
  }
  function screenshots(g){return (g.shots || []).map(imgUrl).filter(Boolean);}
  function safeUrl(s){return /^https:\/\/[^\s"<>]+$/i.test(s || "") ? s : "";}
  function isMulti(g){return /[2]\s*[–—-]\s*[3-9]|最多\s*[3-9]|[3-9]\s*人|1\s*[–—-]\s*[3-9]|多人/.test(g.people || "");}
  function persist(){
    try { localStorage.setItem("coop-finder-saved-v2", JSON.stringify(Array.from(saved))); }
    catch (_) {}
    document.getElementById("saved-count").textContent = saved.size;
  }
  function filtered(){
    var a = GAMES.filter(function(g){
      var q = state.query.toLowerCase();
      if(q && ![g.name,g.en,g.zh,g.genre,g.why].join(" ").toLowerCase().includes(q)) return false;
      if(state.genre !== "all" && category(g) !== state.genre) return false;
      if(state.mode === "shared" && !(g.form || "").includes("同屏")) return false;
      if(state.mode === "split" && !(g.form || "").includes("分屏")) return false;
      if(state.mode === "keyboard" && !/键盘/.test((g.form || "") + " " + (g.people || ""))) return false;
      if(state.mode === "multi" && !isMulti(g)) return false;
      if(state.shots && !screenshots(g).length) return false;
      if(state.favorites && !saved.has(g.rank)) return false;
      return true;
    });
    a.sort(function(a,b){
      if(state.sort === "rare") return stars(b)-stars(a) || b.n-a.n || a.rank-b.rank;
      if(state.sort === "likes") return b.likes-a.likes || b.n-a.n || a.rank-b.rank;
      if(state.sort === "original") return a.rank-b.rank;
      return b.n-a.n || b.likes-a.likes || a.rank-b.rank;
    });
    return a;
  }
  function card(g){
    var shots = screenshots(g);
    var cover = shots.length
      ? '<img loading="lazy" decoding="async" src="' + esc(shots[0]) + '" alt="' + esc(g.name) + ' 游戏截图">'
      : '<div class="placeholder">' + esc(g.name) + '</div>';
    var hot = g.n >= 2 ? '<span class="flag special">多人提及</span>' : '<span class="flag">冷门发现</span>';
    return '<article class="game-card" role="button" tabindex="0" aria-label="查看' + esc(g.name) + '详情" data-open="' + g.rank + '">' +
      '<div class="cover' + (shots.length ? '' : ' no-image') + '">' + cover +
        '<div class="cover-top">' + hot + '<button class="heart' + (saved.has(g.rank) ? ' saved' : '') + '" type="button" data-save="' + g.rank + '" aria-label="' + (saved.has(g.rank) ? '从想玩清单移除' : '加入想玩清单') + '" title="加入想玩清单">' + (saved.has(g.rank) ? '♥' : '♡') + '</button></div>' +
        '<div class="cover-bottom"><span class="mode-tag">' + esc(briefPeople(g)) + '</span><span class="mode-tag">' + esc(modeLabel(g)) + '</span></div>' +
      '</div>' +
      '<div class="card-body"><div class="category">' + esc(categoryLabels[category(g)].replace("玩法","")) + '</div>' +
        '<h3 class="name">' + esc(g.name) + '</h3><div class="ename">' + esc(g.en && g.en !== g.name ? g.en : "LOCAL CO-OP") + '</div>' +
        '<p class="summary">' + esc(plain(g.why)) + '</p>' +
        '<div class="card-footer"><span class="evidence">✦ <b>' + g.n + '</b> 条推荐依据</span><span class="card-more">查看详情 ↗</span></div>' +
      '</div></article>';
  }
  function render(){
    var arr = filtered();
    resultCount.innerHTML = '找到 <b>' + arr.length + '</b> 款游戏';
    grid.innerHTML = arr.length ? arr.map(card).join("") :
      '<div class="empty-state" style="grid-column:1/-1"><div class="emoji">🕹️</div><h3>暂时没有匹配的游戏</h3><p>换个类型或取消筛选，再看看有什么惊喜。</p><button type="button" id="reset-all">清空筛选</button></div>';
    document.querySelectorAll("[data-mode]").forEach(function(el){el.classList.toggle("selected",el.dataset.mode === state.mode);el.setAttribute("aria-pressed",el.dataset.mode === state.mode);});
    document.querySelectorAll("[data-genre]").forEach(function(el){el.classList.toggle("selected",el.dataset.genre === state.genre);el.setAttribute("aria-pressed",el.dataset.genre === state.genre);});
    document.getElementById("favorite-toggle").classList.toggle("active",state.favorites);
    document.getElementById("favorite-toggle").setAttribute("aria-pressed",state.favorites);
    document.getElementById("only-shots").checked = state.shots;
    persist();
  }
  function findGame(id){return GAMES.find(function(g){return g.rank === Number(id);});}
  function quote(e){
    var u = safeUrl(e.url);
    var label = {"B站":"B站原评论","豆瓣":"豆瓣原帖","ふりーむ":"ふりーむ作品页","5ch":"5ch讨论","转载站":"转载文章"}[e.src] || "来源链接";
    return '<div class="quote"><p>“' + esc(plain(e.q)) + '”</p><div class="source-line"><span>' + esc(e.src || "社区") + ' · ' + esc(e.when || "时间未注明") + (e.like ? ' · 👍 ' + e.like : '') + '</span>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">查看' + esc(label) + ' ↗</a>' : '') + '</div></div>';
  }
  function closeModal(){
    modalRoot.innerHTML = "";
    document.body.style.overflow = "";
    if(lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function openGame(g){
    if(!g) return;
    lastFocus = document.activeElement;
    var shots = screenshots(g);
    var cover = shots.length ? '<img id="active-image" src="' + esc(shots[0]) + '" alt="' + esc(g.name) + ' 游戏画面">' : '<span class="no-shot">这款暂时没有游戏截图</span>';
    var thumbs = shots.length > 1 ? '<div class="detail-thumbs">' + shots.map(function(s,i){return '<button data-slide="' + i + '" class="' + (i===0?'selected':'') + '" aria-label="查看第' + (i+1) + '张游戏截图"><img loading="lazy" src="' + esc(s) + '" alt=""></button>';}).join("") + '</div>' : '';
    var store = safeUrl(g.steam);
    var src = safeUrl(g.url);
    var links = (store ? '<a href="' + esc(store) + '" target="_blank" rel="noopener noreferrer">去 Steam 看看 ↗</a>' : '') +
      (src ? '<a href="' + esc(src) + '" target="_blank" rel="noopener noreferrer">' + ((g.evs || [])[0] && g.evs[0].src === "ふりーむ" ? '查看 / 下载作品 ↗' : '原始出处 ↗') + '</a>' : '');
    var vids = (g.vids || []).filter(function(v){return !!VIDEOS[v];});
    var videoLinks = vids.length ? '<div class="detail-label">相关视频（与游戏实拍截图分开）</div><div class="detail-ctas">' +
      vids.slice(0,4).map(function(v){return '<a href="https://www.bilibili.com/video/' + encodeURIComponent(v) + '/" target="_blank" rel="noopener noreferrer">▶ ' + esc((VIDEOS[v].owner || "B站") + " 的视频") + '</a>';}).join("") + '</div>' : '';
    var savedText = saved.has(g.rank) ? '♥ 已加入想玩' : '♡ 加入想玩';
    modalRoot.innerHTML =
      '<div class="overlay" id="overlay">' +
        '<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
          '<div class="dialog-head"><div class="caption">CO-OP FINDER <span style="margin:0 8px;color:#d1d5dc">/</span> 游戏详情 · #' + g.rank + '</div><button class="x" id="close-dialog" type="button" aria-label="关闭详情">×</button></div>' +
          '<div class="dialog-scroll"><div class="dialog-content">' +
            '<div><div class="detail-main-image">' + cover + '</div>' + thumbs + videoLinks + '</div>' +
            '<div><div class="category">' + esc(categoryLabels[category(g)]) + '</div><h2 id="dialog-title" class="detail-title">' + esc(g.name) + '</h2>' +
              '<p class="detail-en">' + esc(g.en || g.zh || '') + '</p>' +
              '<div class="detail-badges"><span>👥 ' + esc(g.people) + '</span><span>🖥 ' + esc(g.form) + '</span><span>✦ ' + g.n + ' 条推荐依据</span><span>冷门度 ' + stars(g) + '/5 · 主观评价</span></div>' +
              '<div class="detail-label">游戏类型</div><p class="detail-why">' + esc(g.genre) + '</p>' +
              '<div class="detail-label">为什么值得试试</div><p class="detail-why">' + esc(plain(g.why)) + '</p>' +
              '<div class="detail-ctas">' + links + '<button type="button" id="detail-save" data-save="' + g.rank + '" class="' + (saved.has(g.rank) ? 'saved' : '') + '">' + savedText + '</button></div>' +
            '</div>' +
          '</div><div class="detail-sources"><h3>玩家是怎么说的？ · ' + (g.evs || []).length + ' 条来源</h3>' +
          (g.evs || []).map(quote).join("") +
          '<p class="disclaimer">以上信息来自社区评论及作品页，未逐款实测；是否支持你使用的平台、具体手柄方案、价格、语言与购买渠道，请以游戏官方页面为准。冷门度不是质量评分。</p>' +
          '</div></div></section></div>';
    document.body.style.overflow = "hidden";
    document.getElementById("close-dialog").focus();
  }
  function reset(){
    state = {query:"",mode:"all",genre:"all",sort:"popular",shots:false,favorites:false};
    document.getElementById("search").value = "";
    document.getElementById("sort").value = "popular";
    render();
  }
  document.getElementById("search").addEventListener("input",function(e){state.query=e.target.value.trim();render();});
  document.getElementById("sort").addEventListener("change",function(e){state.sort=e.target.value;render();});
  document.getElementById("only-shots").addEventListener("change",function(e){state.shots=e.target.checked;render();});
  document.getElementById("favorite-toggle").addEventListener("click",function(){
    state.favorites=!state.favorites;
    render();
    document.getElementById("discover").scrollIntoView({behavior:"smooth",block:"start"});
  });
  document.getElementById("random-pick").addEventListener("click",function(){
    var arr=filtered(); if(!arr.length) arr=GAMES;
    openGame(arr[Math.floor(Math.random()*arr.length)]);
  });
  document.addEventListener("click",function(e){
    var mode=e.target.closest("[data-mode]");
    if(mode){state.mode=mode.dataset.mode;render();return;}
    var genre=e.target.closest("[data-genre]");
    if(genre){state.genre=genre.dataset.genre;render();return;}
    if(e.target.closest("#reset-all")){reset();return;}
    if(e.target.id==="overlay" || e.target.closest("#close-dialog")){closeModal();return;}
    var thumb=e.target.closest("[data-slide]");
    if(thumb){
      var img=document.getElementById("active-image");
      var g=findGame(modalRoot.querySelector("[data-save]").dataset.save);
      var shots=g?screenshots(g):[];
      if(img && shots[Number(thumb.dataset.slide)]){
        img.src=shots[Number(thumb.dataset.slide)];
        img.alt=g.name+" 第"+(Number(thumb.dataset.slide)+1)+"张截图";
        modalRoot.querySelectorAll("[data-slide]").forEach(function(t){t.classList.toggle("selected",t===thumb);});
      }
      return;
    }
    var fav=e.target.closest("[data-save]");
    if(fav){
      var id=Number(fav.dataset.save);
      if(saved.has(id))saved.delete(id);else saved.add(id);
      persist();
      if(modalRoot.querySelector(".overlay")){
        var g=findGame(id);
        openGame(g);
      }
      render();
      return;
    }
    var card=e.target.closest("[data-open]");
    if(card)openGame(findGame(card.dataset.open));
  });
  grid.addEventListener("keydown",function(e){
    var c=e.target.closest("[data-open]");
    if(c && (e.key==="Enter" || e.key===" ") && !e.target.closest("button")){
      e.preventDefault();openGame(findGame(c.dataset.open));
    }
  });
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape" && modalRoot.querySelector(".overlay"))closeModal();
  });
  document.getElementById("hero-feature-image").src = screenshots(GAMES[0])[0] || "";
  document.getElementById("feature-title").textContent=GAMES[0].name;
  document.getElementById("feature-description").textContent=GAMES[0].genre+" · "+modeLabel(GAMES[0]);
  document.getElementById("game-total").textContent=GAMES.length;
  render();
})();
