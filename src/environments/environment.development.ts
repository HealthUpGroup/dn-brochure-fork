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
    oi: "https://sandbox.otherincome.healthupgroup.com"
};
