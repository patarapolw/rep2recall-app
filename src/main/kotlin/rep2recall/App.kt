/*
 * This Kotlin source file was generated by the Gradle 'init' task.
 */
package rep2recall

fun main() {
    Server.serve(Config.env["PORT"] ?: "7000")
}