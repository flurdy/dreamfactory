package views

import java.security.MessageDigest

import controllers.routes

object assetUrl {
  private val fingerprints = scala.collection.concurrent.TrieMap.empty[String, Option[String]]

  def apply(path: String): String = {
    val url = routes.Assets.versioned(path).url
    fingerprints.getOrElseUpdate(path, fingerprint(path)).fold(url)(hash => s"$url?v=$hash")
  }

  private def fingerprint(path: String): Option[String] =
    Option(getClass.getClassLoader.getResourceAsStream(s"public/$path")).map { asset =>
      try {
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = new Array[Byte](8192)
        Iterator
          .continually(asset.read(buffer))
          .takeWhile(_ != -1)
          .foreach(bytesRead => digest.update(buffer, 0, bytesRead))
        digest.digest().map("%02x".format(_)).mkString
      } finally asset.close()
    }
}
