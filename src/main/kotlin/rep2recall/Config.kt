package rep2recall

import io.github.cdimascio.dotenv.dotenv
import net.harawata.appdirs.AppDirsFactory
import org.apache.commons.io.FileUtils
import java.io.File
import java.nio.file.Paths
import kotlin.concurrent.thread

object Config {
    val env = dotenv {
        ignoreIfMissing = true
    }

    val tempFolder = env.get("MONGO_URI")?.let {
        "tmp"
    } ?: env.get("COLLECTION")?.let {
        Paths.get(File(it).parent, "..", "tmp").toAbsolutePath().toString()
    } ?: let {
        val userDataDir = AppDirsFactory.getInstance().getUserDataDir("rep2recall", null, null)
        Paths.get(userDataDir, "tmp").toString()
    }

    init {
        File(tempFolder).mkdirs()

        Runtime.getRuntime().addShutdownHook(thread {
            FileUtils.forceDelete(File(tempFolder))
        })
    }
}