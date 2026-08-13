// SANDBOX/dev build — deploy ไป sandbox.promotion.drugnetcenter.com (Jenkins branch `dev`)
// และใช้ตอน `ng serve` ด้วย (configuration `development` ชี้ไฟล์นี้ไฟล์เดียวกัน)
//
// dn.api (ItemService2 / ReturnRequest / IbOb) แยก env ด้วย "โฮสต์คนละตัว" ไม่ใช่ prefix sandbox.*
//   prod → api.drugnetcenter.com (27.254.207.182)  |  dev → dev.drugnetcenter.com (183.88.236.12)
// ยืนยันจาก ../dn.api/jenkinsfile: branch dev deploy เป็น service hu.dn.api.dev.service แล้ว
// health-check ที่ https://dev.drugnetcenter.com/Environment (stage 'E2E (TestHub smoke)')
// และ ../dninhouse/src/environments/environment.sandbox.ts ก็ใช้ dn: "https://dev.drugnetcenter.com"
// ⚠ อย่าเปลี่ยนเป็น sandbox.*.drugnetcenter.com — ตรวจแล้ว NXDOMAIN ทุกตัว (คนละ convention กัน)
export const environment = {
    brochureEndpoint: "https://dev.drugnetcenter.com/ItemService2",
    // imagePath ใช้ร่วมกับ prod — ไม่มี dev counterpart (dninhouse ก็ pin fileServer เป็น prod ทุก env)
    imagePath: "https://file.drugnetcenter.com/drugpos/GoodPictures",
    cnPath: "https://api.drugnetcenter.com/ReturnRequest",
    ibob: "https://dev.drugnetcenter.com/IbOb",
    // Other Income มี backend แยก sandbox (deploy จาก branch dev ของ repo other-income-api)
    // ⚠ host นี้ต้องมี DNS + nginx vhost ชี้ไป hu.other.income.api.dev.service ก่อน ถึงจะใช้ได้จริง
    //   service รันอยู่แล้ว ขาดแค่ vhost — ตรวจ 2026-08-13 ยัง NXDOMAIN
    //
    // ⚠ ตั้งใจใช้ prefix `sandbox.` ไม่ใช่ `dev.` (ต่างจาก 3 ตัวบน) — คนละ owner คนละ convention:
    //   ../other-income-api/jenkinsfile:33 ตั้ง API_URL เป็น sandbox.otherincome.healthupgroup.com
    //   แล้ว health-check โฮสต์นี้ทุกครั้งที่ deploy branch dev → ต้องสะกดให้ตรงกับที่ repo นั้นจะสร้าง vhost
    //   (เทียบ: ../dninhouse ใช้ sandbox.inhouse-api.drugnetcenter.com ซึ่งมีจริง — `sandbox.` ไม่ได้ผิด)
    // ❓ OPEN: ยังไม่ได้ถามทีม other-income-api ว่าจะสร้าง vhost ชื่อ sandbox.* ตาม jenkinsfile
    //   หรือจะเปลี่ยนเป็น dev.otherincome.* ให้ตรงกับ dn.api — ถ้าเปลี่ยน ต้องแก้ "ทั้งสองที่พร้อมกัน"
    //   (บรรทัดนี้ + jenkinsfile:33) ไม่งั้น frontend จะชี้โฮสต์ที่ไม่มีใครสร้าง และไม่มี DNS ให้จับผิด
    oi: "https://sandbox.otherincome.healthupgroup.com"
};
