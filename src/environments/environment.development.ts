export const environment = {
    brochureEndpoint: "https://dev.drugnetcenter.com/ItemService2",
    imagePath: "https://file.drugnetcenter.com/drugpos/GoodPictures",
    cnPath: "https://api.drugnetcenter.com/ReturnRequest",
    ibob: "https://dev.drugnetcenter.com/IbOb",
    // Other Income มี backend แยก sandbox (deploy จาก branch dev ของ repo other-income-api)
    // ⚠ host นี้ต้องมี DNS + nginx vhost ชี้ไป hu.other.income.api.dev.service ก่อน ถึงจะใช้ได้จริง
    oi: "https://sandbox.otherincome.healthupgroup.com"
};
