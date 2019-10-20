package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._
// import util.Random
// import org.joda.time.DateTime
// import org.joda.time.format.DateTimeFormat
// import java.net.URL


import EnumModel._

object Licenses {
   sealed abstract class License(val name: String, val link: String, val isOpenSource: Boolean) extends EnumName
   object License      extends EnumParse[License]
   case object Agpl3   extends License("AGPL v3", "https://opensource.org/licenses/agpl-3.0", true)
   case object Apache2 extends License("Apache 2.0", "https://www.apache.org/licenses/LICENSE-2.0", true)
   case object Respect extends License("Respect", "http://flurdy.com/docs/license/respect/0.3/", true)
   case object Bsd     extends License("BSD", "https://opensource.org/licenses/BSD-3-Clause", true)
   case object Mit     extends License("MIT", "https://opensource.org/licenses/MIT", true)
   case object Gpl     extends License("GPL", "https://opensource.org/licenses/gpl-license", true)
   case object Lgpl    extends License("LGPL", "https://opensource.org/licenses/lgpl-license", true)
   case object CcSa    extends License("Creative Commons - Attribution ShareAlike", "https://creativecommons.org/licenses/by-sa/2.5/", true)
   case object Proprietary extends License("Proprietary", "https://eray.uk", false)
   val licenses: Set[License] = Set(Agpl3, Apache2, Respect, Bsd, Mit, Gpl, Lgpl, CcSa, Proprietary)
}
