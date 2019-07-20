package rep2recall

import spark.kotlin.port
import spark.kotlin.before
import spark.kotlin.options


object Server {
    fun serve(_port: String) {
        port(_port.toInt())

        options("/*") {
            val accessControlRequestHeaders = request
                    .headers("Access-Control-Request-Headers")
            if (accessControlRequestHeaders != null) {
                response.header("Access-Control-Allow-Headers",
                        accessControlRequestHeaders)
            }

            val accessControlRequestMethod = request
                    .headers("Access-Control-Request-Method")
            if (accessControlRequestMethod != null) {
                response.header("Access-Control-Allow-Methods",
                        accessControlRequestMethod)
            }

            "OK"
        }

        before { response.header("Access-Control-Allow-Origin", "*") }
    }
}