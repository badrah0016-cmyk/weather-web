import logger from "./logger.js";


// ==========================================
// RETRY FUNCTION
// ==========================================

export async function retry(
    fn,
    maxRetry = 3,
    delayMs = 2000,
    customLogger = logger
) {

    let lastError;


    // ==========================================
    // RETRY LOOP
    // ==========================================

    for (
        let attempt = 1;
        attempt <= maxRetry;
        attempt++
    ) {

        try {

            // ==========================================
            // API ОРОЛДЛОГО
            // ==========================================

            customLogger.info(
                `🔄 API оролдлого ${attempt}/${maxRetry}`
            );


            // ==========================================
            // API ХҮСЭЛТ
            // ==========================================

            const result =
                await fn();


            // ==========================================
            // АМЖИЛТ
            // ==========================================

            customLogger.info(
                "✅ API хүсэлт амжилттай"
            );


            return result;


        } catch (error) {

            lastError = error;


            // ==========================================
            // API АЛДАА
            // ==========================================

            customLogger.error(
                `❌ API хүсэлт амжилтгүй: ${
                    error.message
                }`
            );


            // ==========================================
            // СҮҮЛИЙН ОРОЛДЛОГО ЭСЭХ
            // ==========================================

            if (
                attempt === maxRetry
            ) {

                customLogger.error(
                    `❌ ${maxRetry} удаа оролдсон боловч амжилтгүй`
                );


                throw lastError;
            }


            // ==========================================
            // EXPONENTIAL BACKOFF
            // ==========================================

            const delay =
                delayMs *
                Math.pow(
                    2,
                    attempt - 1
                );


            customLogger.warn(
                `⏳ ${
                    delay / 1000
                } секунд хүлээгээд дахин оролдоно...`
            );


            // ==========================================
            // ХҮЛЭЭХ
            // ==========================================

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        delay
                    )
            );

        }

    }

}

