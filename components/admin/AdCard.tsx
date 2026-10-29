import { Cinzel } from "next/font/google";
import { CARD_PROGRAM, CARD_ROLES, CARD_ROLE_ORDER, CARD_TEXT, cardNames, nameFontPx, type BackCategory, type CardData } from "@/lib/adcard";
import styles from "./AdCard.module.css";

// บัตรห้อยคอ A6 (ใบ K-P5) · ออกแบบที่ 397×559px (= 105×148mm ที่ 96dpi) แล้วห่อด้วยกล่อง mm ตอนพิมพ์ (ดู AdCardsClient)
// ฟอนต์: ตัวหัวอังกฤษ Cinzel (โหลดผ่าน next/font ไม่เพิ่มแพ็กเกจ) · ไทยและตัวอื่นใช้ Kanit ของโปรเจกต์ (ตามใบ: มีฟอนต์ CI แล้วใช้ของเดิม ไม่เพิ่ม Prompt)
const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

const PMAT_LOGO = "/brand/pmat-logo.png";
const BTS_LOGO = "/brand/bts-badge.png";

export type AdEventInfo = { dateEn: string; dateTh: string; venueEn: string };

function Hole() {
  return <i className={styles.hole} aria-hidden />;
}

/** ข้อความที่ยังไม่มีข้อมูล = เส้นประสีจาง ดูออกว่ารอกรอก (ไม่ใส่ค่าสมมติ) */
function Blank({ children }: { children: string }) {
  return <span className={styles.blank}>{children}</span>;
}

/** preview = พรีวิวบนจอเท่านั้น (แสดงเส้นประรอกรอกได้) · ตอนพิมพ์ห้ามส่ง preview → ไม่มีข้อความ placeholder บนบัตรจริง */
export function AdCardFront({ card, event, preview = false }: { card: CardData; event: AdEventInfo; preview?: boolean }) {
  const role = CARD_ROLES[card.role];
  const { main: nameMain, sub: nameSub } = cardNames(card);
  const second = card.second.map((s) => s.trim()).filter(Boolean);
  return (
    <div className={styles.card} data-face="front">
      <Hole />
      <div className={styles.frame} />
      <div className={`${styles.inner} ${styles.innerFront}`}>
        <div className={styles.head}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.pmat} src={PMAT_LOGO} alt="PMAT" width={58} height={58} />
          <div className={styles.titles}>
            <span className={`${cinzel.className} ${styles.t1}`}>EASTERN</span>
            <span className={`${cinzel.className} ${styles.t2}`}>BEAUTY &amp; WELLNESS</span>
            <span className={`${cinzel.className} ${styles.t3}`}>CHAMPIONSHIP 2026</span>
          </div>
        </div>
        <p className={styles.titleTh}>{CARD_TEXT.titleTh}</p>
        <div className={styles.dateBand}>
          {event.dateEn ? `${event.dateEn} · PATTAYA THAILAND` : "PATTAYA THAILAND"}
        </div>

        <div className={styles.main}>
          <div className={styles.photo}>
            {card.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photo} alt="" className={card.code ? styles.photoCutout : styles.photoCover} />
            ) : (
              <div className={styles.photoEmpty}>
                <svg viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="36" r="20" fill="currentColor" />
                  <path d="M10 100c0-24 18-38 40-38s40 14 40 38z" fill="currentColor" />
                </svg>
                <span>รอรูป 3×4</span>
              </div>
            )}
          </div>
          <div className={styles.info}>
            <span className={styles.label}>NAME · ชื่อ</span>
            <div className={styles.nameTh} style={{ fontSize: nameFontPx(nameMain) }}>
              {nameMain || (preview ? <Blank>ชื่อ - นามสกุล</Blank> : null)}
            </div>
            {nameSub ? <div className={styles.nameEn}>{nameSub}</div> : preview && !nameMain ? <div className={styles.nameEn}><Blank>Name Surname</Blank></div> : null}
            <span className={`${styles.label} ${styles.labelGap}`}>{role.secondLabel}</span>
            <div className={styles.second}>
              {second.length ? second.map((s, i) => <div key={i}>{s}</div>) : preview ? <Blank>…………………………</Blank> : null}
            </div>
            {card.shop && <div className={styles.shop}>{card.shop}</div>}
            {card.role === "competitor" && (
              <div className={styles.codeBox}>
                <span className={styles.codeNo}>NO.</span>
                <span className={`${cinzel.className} ${styles.codeVal}`}>{card.code || "—"}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.venue}>
          <div className={styles.venueLine}>
            <b>{event.venueEn.toUpperCase()}</b> · {CARD_TEXT.venueLine}
          </div>
          <div className={styles.organizer}>{CARD_TEXT.organizerLine}</div>
        </div>
      </div>

      <div className={styles.band} style={{ background: role.bg, color: role.fg }}>
        <div className={styles.bandText}>
          <span className={`${cinzel.className} ${styles.bandEn}`}>{role.en}</span>
          <span className={styles.bandTh}>{role.th}</span>
          <span className={styles.bandNote}>{CARD_TEXT.notice}</span>
        </div>
        <div className={styles.bts}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BTS_LOGO} alt="Balehm Tech Studio" width={30} height={30} />
          <span>{CARD_TEXT.systemBy}</span>
        </div>
      </div>
    </div>
  );
}

export function AdCardBack({ categories, event }: { categories: BackCategory[]; event: AdEventInfo }) {
  return (
    <div className={styles.card} data-face="back">
      <Hole />
      <div className={styles.frame} />
      <div className={`${styles.inner} ${styles.innerBack}`}>
        <h3 className={styles.h3}>
          PROGRAM · กำหนดการ{event.dateTh ? ` ${event.dateTh}` : ""}
        </h3>
        <ul className={styles.program}>
          {CARD_PROGRAM.map((p, i) => (
            <li key={i}>
              <span className={styles.pTime}>{p.time ?? ""}</span>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>

        <h3 className={styles.h3}>CATEGORIES · ประเภทการแข่งขัน</h3>
        <ul className={styles.cats}>
          {categories.length === 0 && (
            <li>
              <Blank>ยังไม่มีประเภทในระบบ</Blank>
            </li>
          )}
          {categories.map((c) => (
            <li key={c.id}>
              <span className={`${styles.chip} ${styles[`chip_${c.session}`]}`}>{c.sessionLabel}</span>
              <span>{c.name}</span>
            </li>
          ))}
        </ul>

        <div className={styles.roles}>
          {CARD_ROLE_ORDER.map((k) => (
            <div key={k} className={styles.roleCell} style={{ background: CARD_ROLES[k].bg, color: CARD_ROLES[k].fg }}>
              <b className={cinzel.className}>{CARD_ROLES[k].en}</b>
              <span>{CARD_ROLES[k].th}</span>
            </div>
          ))}
        </div>

        <div className={styles.foot}>
          <div className={styles.reg}>{CARD_TEXT.register}</div>
          <div className={styles.footRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PMAT_LOGO} alt="PMAT" width={26} height={26} />
            <span>{CARD_TEXT.organizerLine}</span>
          </div>
          <div className={styles.footRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BTS_LOGO} alt="Balehm Tech Studio" width={26} height={26} />
            <span>{CARD_TEXT.systemLive}</span>
          </div>
        </div>
        {/* QR ยังไม่ได้สร้าง: รีโปไม่มีไลบรารี QR และใบ K-P5 ห้ามเพิ่ม dependency → เว้นกรอบไว้ตามใบ (รายงานในใบตอบ) */}
        <div className={styles.qr} title="กรอบ QR (ยังไม่ได้สร้าง)">
          QR
        </div>
      </div>
    </div>
  );
}
