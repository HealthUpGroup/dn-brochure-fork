// DN-BROCHURE frontend (Angular 21) — build in Docker on apd.local, deploy to file.drugnetcenter.com.
// Modelled on ../dninhouse/Jenkinsfile: same agent, same SSH credential, same atomic .new/.bak swap.
//
// Stages: Checkout → Build → Unit test → Archive → Approve PROD (prod only) → Deploy
//
// Multibranch-ready: use a "Multibranch Pipeline" job pointed at this repo. Every branch & PR is
// built + tested + archived; only the deploy branches push to a web root:
//   branch dev  → sandbox.promotion.drugnetcenter.com   (DEV)
//   branch prod → promotion.drugnetcenter.com           (PROD, live)
// other branches / PRs are build-only.
//
// ⚠️ TODO ก่อนใช้จริง — ยืนยันกับคนที่ดูแล Jenkins/เซิร์ฟเวอร์ (ดู comment ที่ตัวแปรแต่ละตัว):
//   1. DEV_PATH  — ต้องสร้าง DNS + nginx vhost ของ sandbox.promotion.drugnetcenter.com ก่อน (ยัง NXDOMAIN)
//                  PROD_PATH ยืนยันแล้ว: promotion.drugnetcenter.com
//   2. SSH_CRED  — credential นี้มีสิทธิ์เขียน web root ของ promotion ไหม
//   3. TESTHUB_API_TOKEN — job นี้ต้องอ่าน credential 'testhub-api-token' ได้ (dninhouse ใช้อยู่แล้ว)
//                          ถ้าอ่านไม่ได้ pipeline จะพังตั้งแต่ตอน evaluate environment block
//   4. sandbox.otherincome.healthupgroup.com (key `oi` ใน environment.development.ts) ยัง NXDOMAIN เช่นกัน
//      — deploy dev ตอนนี้จะได้หน้าเว็บที่ Other Income ยิง API ไม่ติด
//
// ⚠️ สิทธิ์: การ swap แบบ sudo-free (mv html → html.bak) ต้องให้ผู้ใช้ deploy เป็นเจ้าของ "โฟลเดอร์แม่"
//   ไม่ใช่แค่ตัว html — ถ้าไม่ใช่ mv จะ EACCES. chown ครั้งเดียวบนเซิร์ฟเวอร์ก็พอ.
//
// Angular-21 notes (ต่างจาก dninhouse ที่เป็น Angular 17 — อย่าลอกค่าพวกนี้ข้ามโปรเจกต์):
//   • builder = @angular-devkit/build-angular:application → dist มีโฟลเดอร์ย่อย /browser
//     ของจริงคือ dist/dn-prochure/browser/index.html  (dninhouse ใช้ builder :browser จึงไม่มี /browser)
//   • ชื่อโปรเจกต์ใน angular.json สะกดว่า "dn-prochure" (ไม่ใช่ brochure) — path ต้องตามนั้น
//   • Node 22.22.0 (package.json engines + .nvmrc pin ไว้ตรงตัว) — ไม่ใช่ Node 20
//   • build script แยกตาม branch (ดู BUILD_SCRIPT ใน stage 'Build') — ชื่อ script ตรงกับ dninhouse:
//       prod → `npm run build`         (= --configuration production → src/environments/environment.ts)
//       dev  → `npm run build:sandbox` (= --configuration sandbox    → environment.development.ts)
//     configuration `sandbox` = ของ production ทุกอย่าง (budgets + outputHashing) บวก fileReplacements
//     ระวังอย่าสับสน: `sandbox` (ไว้ deploy) ≠ `development` (ไว้ ng serve — optimization:false + sourceMap:true)
//     ห้ามใช้ `development` มา deploy เด็ดขาด แต่ทั้งคู่ชี้ environment.development.ts ไฟล์เดียวกัน
//     ตอนนี้ต่างกันแค่ key `oi` (Other Income): prod → api.otherincome…, dev → sandbox.otherincome…
//     ส่วน brochureEndpoint/cnPath/ibob ยังชี้ api.drugnetcenter.com เหมือนกันทั้งสอง env
pipeline {
  agent { label 'apd.local' }           // Jenkins node = apd.local (has Docker; jenkins user in docker group)

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  environment {
    NODE_IMAGE  = 'node:22.22.0'                  // ตรงกับ .nvmrc / engines pin
    DIST_DIR    = 'dist/dn-prochure/browser'      // builder :application → มี /browser (ยืนยันจาก build จริง)
    NODE_OPTS   = '--max_old_space_size=4096'     // esbuild กินน้อยกว่า webpack แต่กันไว้
    DEPLOY_HOST = 'px@file.drugnetcenter.com'
    DEPLOY_PORT = '5333'                          // SSH port on file.drugnetcenter.com
    SSH_CRED    = 'px-file-drugnetcenter'         // ⚠️ ยืนยัน: credential เดียวกับ dninhouse — มีสิทธิ์เขียน brochure web root ไหม
    // branch → web root on the deploy host (the Deploy stage picks one of these)
    // path convention ยืนยันจาก ../dninhouse/Jenkinsfile: /var/www/<domain>/html
    // ⚠️ ยังไม่มี DNS record ของ sandbox.promotion.drugnetcenter.com (NXDOMAIN) — ต้องสร้าง DNS + nginx
    //   vhost ก่อน ไม่งั้น deploy สำเร็จแต่ไม่มีใครเปิดดูได้ (เทียบ: sandbox.inhouse.drugnetcenter.com มีจริง)
    DEV_PATH    = '/var/www/sandbox.promotion.drugnetcenter.com/html'  // branch: dev
    PROD_PATH   = '/var/www/promotion.drugnetcenter.com/html'          // branch: prod — domain ยืนยันแล้ว (resolve → 27.254.207.182)
    // --- TestHub: prod approval gate (แบบเดียวกับ ../dninhouse/Jenkinsfile) ---
    // อนุมัติ prod ผ่านหน้า TestHub (/approvals) แทน input ของ Jenkins → PM ไม่ต้องเข้า Jenkins
    // ต้องมี Jenkins credential 'testhub-api-token' (secret text) — dninhouse ใช้ตัวนี้อยู่แล้ว
    TESTHUB_URL = "https://testhub.healthupgroup.com"
    TESTHUB_API_TOKEN = credentials('testhub-api-token')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build (Docker)') {
      // Build inside node:22.22.0 so the agent only needs Docker (no Node tool install). Run as the
      // jenkins uid/gid with HOME + npm cache UNDER the mounted workspace (/app) so they're writable
      // by that uid (the uid has no home in the image → npm would hit EACCES on /home/node) and
      // nothing lands root-owned (cleanWs works). The `docker run` is ONE line on purpose:
      // backslash line-continuations inside a Groovy '''...''' string get consumed and mangle the args.
      //
      // npm ci ต้องออกเน็ตได้: dependency `xlsx` ดึงจาก https://cdn.sheetjs.com (tarball ตรง ไม่ใช่ registry)
      // ถ้า agent ออกเน็ตจำกัด ต้อง allow host นั้นด้วย ไม่งั้น install พัง
      // ไม่ต้องใช้ --legacy-peer-deps (ต่างจาก dninhouse) — dependency tree ของ Angular 21 สะอาด
      //
      // Per-branch environment: prod → build (configuration production → environment.ts);
      // dev & everything else → build:sandbox (configuration sandbox → environment.development.ts)
      // เพื่อให้ sandbox SPA ยิง API ชุด dev ไม่ใช่ prod. ค่า default เป็น sandbox เสมอ — build-only
      // branch จะได้ไม่ยิง API prod ตอนเอา artifact ไปเปิดดู
      steps {
        script {
          env.BUILD_SCRIPT = (env.BRANCH_NAME == 'prod') ? 'build' : 'build:sandbox'
          echo "Build script: npm run ${env.BUILD_SCRIPT} (branch: ${env.BRANCH_NAME ?: 'pipeline'})"
        }
        sh '''
          set -e
          mkdir -p "${WORKSPACE}/.home" "${WORKSPACE}/.npm"
          docker run --rm -u $(id -u):$(id -g) -e HOME=/app/.home -e npm_config_cache=/app/.npm -e CI=true -e NODE_OPTIONS=${NODE_OPTS} -v "${WORKSPACE}:/app" -w /app ${NODE_IMAGE} bash -c "node -v && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && npm run ${BUILD_SCRIPT}"
          test -f "${DIST_DIR}/index.html"
        '''
      }
    }

    stage('Unit test') {
      // ลำดับ Build → Unit test → Archive ตั้งใจแบบนี้:
      //   • Build ก่อน — ถ้า type error ใน app code จะได้ error ของ Angular ตรงๆ อ่านง่ายกว่า
      //     error ตอน Karma bundle (มันพังทั้งคู่แหละ แต่ข้อความต่างกันมาก)
      //   • Test ก่อน Archive — artifact ที่เก็บไว้จะเป็นของที่เทสต์ผ่านเท่านั้น ไม่งั้นจะมีไฟล์
      //     ที่ดาวน์โหลดได้แต่ deploy ไม่ควร ค้างอยู่ใน Jenkins
      // ไม่ได้เอา test ขึ้นก่อน build เพราะ Karma compile ทั้งแอปอยู่แล้ว — ไม่ใช่ smoke check ที่เร็วกว่า
      // ยังคุ้มที่จะรันแม้ build ผ่าน: spec compile ด้วย tsconfig.spec.json คนละตัวกับ tsconfig.app.json
      // spec พังแต่ build เขียว เป็นสถานะที่รีโปนี้เคยอยู่จริง
      //
      // ใช้ workspace เดียวกับ Build → node_modules + Chromium ของ puppeteer มีอยู่แล้ว ไม่ต้อง npm ci ซ้ำ
      // CHROME_BIN ต้องชี้ Chromium ของ puppeteer — image node:22.22.0 ไม่มี browser ติดมา
      // (puppeteer v25 executablePath() คืน Promise จึงต้อง await ก่อน)
      // launcher ChromeHeadlessNoSandbox อยู่ใน karma.conf.js — ต้องมี --no-sandbox เพราะรันเป็น
      // non-root uid ใน Docker
      steps {
        sh '''
          set -e
          docker run --rm -u $(id -u):$(id -g) -e HOME=/app/.home -e npm_config_cache=/app/.npm -e CI=true -v "${WORKSPACE}:/app" -w /app ${NODE_IMAGE} bash -c "export CHROME_BIN=\\$(node -e \\"Promise.resolve(require('puppeteer').executablePath()).then(p=>console.log(p))\\") && echo \\"CHROME_BIN=\\$CHROME_BIN\\" && npm run test:headless"
        '''
      }
    }

    stage('Archive') {
      // เก็บ artifact ไว้ย้อนดู/rollback (เก็บตาม buildDiscarder = 15 builds ล่าสุด)
      // ห่อ catchError ไว้เหมือน dninhouse: ถ้า archive พัง (เช่นวันหลังมีไฟล์ asset ชื่อภาษาไทย แล้ว
      // JVM บน agent ไม่ได้ตั้ง locale UTF-8 → InvalidPathException) ต้องไม่บล็อก Deploy
      // ตอนนี้ไฟล์ใน repo เป็น ASCII ล้วน จึงยังไม่เจอปัญหา — กันไว้ก่อน
      steps {
        catchError(message: 'archiveArtifacts failed — continuing to Deploy', buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          archiveArtifacts artifacts: "${DIST_DIR}/**", fingerprint: true
        }
      }
    }

    stage('Approve PROD (TestHub)') {
      // อนุมัติ prod ผ่านหน้า TestHub (/approvals) — สร้างคำขอ → poll จนกว่าจะอนุมัติ/ปฏิเสธ/หมดอายุ
      // PM ไม่ต้องเข้า Jenkins กด. dev/สาขาอื่นข้าม gate นี้ไป
      // Gate ทุกครั้งที่ deploy ขึ้น live ไม่ใช่แค่ครั้งแรก
      // fail-safe: ถ้า TestHub เข้าไม่ได้/สร้างคำขอไม่ได้ → build fail (ไม่ deploy prod โดยไม่อนุมัติ)
      when { branch 'prod' }
      options { timeout(time: 60, unit: 'MINUTES') }
      steps {
        sh '''
            BODY=$(printf '{"kind":"deploy-prod","title":"Deploy DN Brochure prod #%s","buildUrl":"%s","timeoutSec":3300}' "$BUILD_NUMBER" "$BUILD_URL")
            ID=$(curl -sS -X POST "$TESTHUB_URL/api/approvals" -H "Authorization: Bearer $TESTHUB_API_TOKEN" -H "Content-Type: application/json" -d "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            if [ -z "$ID" ]; then echo "สร้างคำขออนุมัติที่ TestHub ไม่ได้ (เช็ก TESTHUB_URL/token/การเชื่อมต่อ)"; exit 1; fi
            echo "รออนุมัติที่: $TESTHUB_URL/approvals/$ID"
            while : ; do
              S=$(curl -sS "$TESTHUB_URL/api/approvals/$ID" -H "Authorization: Bearer $TESTHUB_API_TOKEN" | grep -o '"status":"[a-z]*"' | head -1 | cut -d'"' -f4)
              [ "$S" = pending ] || break
              sleep 15
            done
            echo "ผลอนุมัติ: $S"
            [ "$S" = approved ] || { echo "ยกเลิก deploy (prod $S)"; exit 1; }
        '''
      }
    }

    stage('Deploy') {
      // Multibranch: dev → sandbox, prod → live; other branches & PRs (BRANCH_NAME = PR-*) are
      // build-only. The null check keeps a plain (non-multibranch) pipeline job working (→ DEV).
      when { anyOf { branch 'dev'; branch 'prod'; expression { env.BRANCH_NAME == null } } }
      steps {
        script {
          // pick the web root for this branch — default = DEV/sandbox, ห้าม default เป็น prod เด็ดขาด
          env.DEPLOY_PATH = (env.BRANCH_NAME == 'prod') ? env.PROD_PATH : env.DEV_PATH
          env.DEPLOY_ENV  = (env.BRANCH_NAME == 'prod') ? 'PROD (live)' : 'DEV (sandbox)'
          echo "Deploying ${env.DEPLOY_ENV} -> ${env.DEPLOY_PATH}"
        }
        // Use the SSH private-key credential directly (no SSH Agent plugin needed). Each ssh/scp is
        // ONE line — backslash line-continuations get eaten by the Groovy '''...''' string.
        withCredentials([sshUserPrivateKey(credentialsId: "${SSH_CRED}", keyFileVariable: 'SSH_KEY')]) {
          sh '''
            set -e
            # Use ONLY the -i key: IdentityAgent=none ignores any ssh-agent on the Jenkins node and
            # IdentitiesOnly=yes ignores default keys — otherwise ssh offers all of them and the server
            # hits MaxAuthTries → "Too many authentication failures". Restrict auth to publickey too.
            SSHOPT="-o IdentityAgent=none -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o StrictHostKeyChecking=accept-new"
            SSH="ssh -i $SSH_KEY -p ${DEPLOY_PORT} $SSHOPT"
            # atomic-ish swap: upload to .new, swap into place, keep .bak for rollback
            $SSH ${DEPLOY_HOST} "rm -rf ${DEPLOY_PATH}.new && mkdir -p ${DEPLOY_PATH}.new"
            scp -i $SSH_KEY -P ${DEPLOY_PORT} $SSHOPT -r ${DIST_DIR}/* ${DEPLOY_HOST}:${DEPLOY_PATH}.new/
            $SSH ${DEPLOY_HOST} "rm -rf ${DEPLOY_PATH}.bak; [ -d ${DEPLOY_PATH} ] && mv ${DEPLOY_PATH} ${DEPLOY_PATH}.bak; mv ${DEPLOY_PATH}.new ${DEPLOY_PATH}"
            # Rollback (remote): mv html html.broken && mv html.bak html
          '''
        }
      }
    }
  }

  post {
    // แจ้งผลผ่าน TestHub เฉพาะ branch ที่ deploy จริง (dev/prod). || true กัน notify ล้มทำ build เพี้ยน
    failure {
      mail to: 'tom.dncenter@gmail.com',
           subject: "❌ DN-BROCHURE build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
           body: "Check ${env.BUILD_URL}"
      sh '''
        case "$BRANCH_NAME" in dev|prod) ;; *) exit 0 ;; esac
        BODY=$(printf '{"title":"DN Brochure #%s","text":"deploy ล้มเหลว / ไม่อนุมัติ","level":"error","url":"%s"}' "$BUILD_NUMBER" "$BUILD_URL")
        curl -sS -m 10 -X POST "$TESTHUB_URL/api/notify" -H "Authorization: Bearer $TESTHUB_API_TOKEN" -H "Content-Type: application/json" -d "$BODY" || true
      '''
    }
    success {
      script {
        def br = env.BRANCH_NAME ?: 'pipeline'
        if (env.DEPLOY_PATH)
          echo "✅ DN-BROCHURE (${br}) deployed ${env.DEPLOY_ENV} -> ${DEPLOY_HOST}:${env.DEPLOY_PATH}"
        else
          echo "✅ DN-BROCHURE (${br}) built — not deployed (deploy branches: dev, prod)"
      }
      sh '''
        case "$BRANCH_NAME" in dev|prod) ;; *) exit 0 ;; esac
        BODY=$(printf '{"title":"DN Brochure #%s","text":"deploy สำเร็จ","level":"success","url":"%s"}' "$BUILD_NUMBER" "$BUILD_URL")
        curl -sS -m 10 -X POST "$TESTHUB_URL/api/notify" -H "Authorization: Bearer $TESTHUB_API_TOKEN" -H "Content-Type: application/json" -d "$BODY" || true
      '''
    }
    // เก็บ .npm (npm cache) และ .home (puppeteer แคช Chromium ไว้ที่ HOME) ไม่ให้ถูกลบ
    // ไม่งั้นทุก build จะโหลด dependency ใหม่หมด + โหลด Chromium ~150MB ซ้ำทุกรอบ
    always { cleanWs(patterns: [[pattern: '.npm/**', type: 'EXCLUDE'], [pattern: '.home/**', type: 'EXCLUDE']]) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ต่างจาก ../dninhouse/Jenkinsfile ตรงไหนบ้าง (ตั้งใจให้ต่าง — อย่า "แก้ให้เหมือน" โดยไม่อ่านเหตุผล):
//   • ชื่อ configuration/script (`sandbox`, `build:sandbox`) ตรงกับ dninhouse แต่ "ไฟล์ที่ชี้" ต่างกัน
//     เพราะ convention ของ Angular กลับด้านกันระหว่างเวอร์ชัน:
//       dninhouse (ng17): environment.ts = local, production ชี้ environment.prod.ts,
//                         sandbox ชี้ environment.sandbox.ts → มี env 3 ชุด, ไม่มี config `development`
//       ที่นี่   (ng21): environment.ts = prod (production ไม่มี fileReplacements เลย),
//                         `development` ชี้ environment.development.ts ไว้ให้ ng serve
//     รีโปนี้จึงมี env แค่ 2 ชุด — configuration `sandbox` เลยชี้ environment.development.ts
//     ตั้งใจ: sandbox = ที่ tester เทสต์ และ local ng serve ยิง backend ชุดเดียวกัน ไม่แยกไฟล์ที่ 3
//   • prod ใช้ script `build` ที่มีอยู่เดิมในรีโป (dninhouse ใช้ `build:prod`)
//   • มี stage 'Unit test' (dninhouse ไม่รัน unit test ใน pipeline เลย) — gate แบบ hard ทุก branch
//     ต้องมี puppeteer + karma.conf.js (ChromeHeadlessNoSandbox) ในรีโป ดู docs/testing-notes.md
//   • ไม่มี stage E2E (TestHub smoke) — brochure ยังไม่มี suite ใน TestHub. ถ้ามีเมื่อไหร่
//     ลอกจาก ../dninhouse/Jenkinsfile stage 'E2E (TestHub smoke)' ได้เลย (รันเฉพาะ dev, report-only)
//   • ไม่ใช้ --legacy-peer-deps — dependency tree ของ Angular 21 สะอาด (ยืนยันจาก npm ci จริง)
//   • builder :application → DIST_DIR มี /browser (dninhouse builder :browser จึงไม่มี)
// ─────────────────────────────────────────────────────────────────────────────
