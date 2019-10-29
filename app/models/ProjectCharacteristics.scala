package models

import play.api.Play
import com.google.inject.ImplementedBy
import javax.inject._
import play.api.Configuration
import scala.collection.JavaConversions._


import EnumModel._

object ProjectCharacteristics {

   trait Characteristic extends EnumName {
      def alternatives: Set[String]
      def parentName: String
      override val names: Set[String] = alternatives + name
   }

   sealed abstract class Appeal(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "appeal") extends Characteristic
   object Appeal extends EnumParse[Appeal]
   case object Keen             extends Appeal("keen")
   case object Interested       extends Appeal("interested", Set("good"))
   case object MaybeAppeal      extends Appeal("maybe")
   case object LowAppeal        extends Appeal("low")
   case object NoAppeal        extends Appeal("none")
   val appeals: Set[Appeal] = Set(Keen, Interested, MaybeAppeal, LowAppeal, NoAppeal)

   sealed abstract class Complexity(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "complexity") extends Characteristic
   object Complexity extends EnumParse[Complexity]
   case object VeryComplex      extends Complexity("verydifficult", Set("veryhigh"))
   case object Difficult        extends Complexity("difficult", Set("high","hard"))
   case object MediumComplex    extends Complexity("medium", Set("average"))
   case object Easy             extends Complexity("easy", Set("low"))
   val complexities: Set[Complexity] = Set(VeryComplex, Difficult, MediumComplex, Easy)

   sealed abstract class Likelihood(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "likelihood") extends Characteristic
   object Likelihood extends EnumParse[Likelihood]
   case object HighlyLikely     extends Likelihood("high")
   case object Possibly         extends Likelihood("possibly", Set("maybe"))
   case object Unlikely         extends Likelihood("unlikely", Set("low","slight"))
   case object Never            extends Likelihood("never")
   val likelihoods: Set[Likelihood] = Set(HighlyLikely, Possibly, Unlikely, Never)

   sealed abstract class DevelopmentStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.development") extends Characteristic
   object DevelopmentStatus extends EnumParse[DevelopmentStatus]
   case object Abandoned        extends DevelopmentStatus("abandoned",Set("cancelled","mothballed"))
   case object Alpha            extends DevelopmentStatus("alpha")
   case object Beta             extends DevelopmentStatus("beta")
   case object Completed        extends DevelopmentStatus("completed")
   case object NotStarted       extends DevelopmentStatus("notstarted")
   val developmentStatuses: Set[DevelopmentStatus] = Set(Abandoned, Alpha, Beta, Completed, NotStarted)

   sealed abstract class ReleaseStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.release") extends Characteristic
   object ReleaseStatus extends EnumParse[ReleaseStatus]
   case object Mature           extends ReleaseStatus("mature")
   case object Released         extends ReleaseStatus("released")
   case object BetaRelease      extends ReleaseStatus("beta")
   case object NotReleased      extends ReleaseStatus("notreleased")
   case object Mothballed       extends ReleaseStatus("mothballed")
   val releaseStatuses: Set[ReleaseStatus] = Set(Mature, Released, BetaRelease, NotReleased, Mothballed)

   sealed abstract class DeployStatus(val name: String, val alternatives: Set[String] = Set.empty, val parentName: String = "status.deploy") extends Characteristic
   object DeployStatus extends EnumParse[DeployStatus]
   case object Live             extends DeployStatus("live", Set("demo"))
   case object Offline          extends DeployStatus("offline")
   val deployStatuses: Set[DeployStatus] = Set(Live, Offline)


   case class CharacteristicPossibilities(appeals: Set[Appeal],
                                          complexities: Set[Complexity],
                                          likelihoods: Set[Likelihood],
                                          developmentStatuses: Set[DevelopmentStatus],
                                          releaseStatuses: Set[ReleaseStatus],
                                          deployStatuses: Set[DeployStatus]){

      val isEmpty = appeals.isEmpty && complexities.isEmpty &&
                    likelihoods.isEmpty && developmentStatuses.isEmpty &&
                    releaseStatuses.isEmpty && deployStatuses.isEmpty

      def findCharacteristic(characteristicType: String, name: String) =
        characteristicType match {
           case "appeal"             => Appeal(name,appeals)
           case "complexity"         => Complexity(name, complexities)
           case "likelihood"         => Likelihood(name, likelihoods)
           case "status.development" => DevelopmentStatus(name, developmentStatuses)
           case "status.release"     => ReleaseStatus(name, releaseStatuses)
           case "status.deploy"      => DeployStatus(name, deployStatuses)
           case _ => None
        }
   }

   val characteristicPossibilities = CharacteristicPossibilities(appeals, complexities, likelihoods, developmentStatuses, releaseStatuses, deployStatuses)
}

import ProjectCharacteristics._

case class ProjectCharacteristics( appeal:            Option[Appeal],
                                   complexity:        Option[Complexity],
                                   likelihood:        Option[Likelihood], // resuscitate
                                   developmentStatus: Option[DevelopmentStatus],
                                   releaseStatus:     Option[ReleaseStatus],
                                   deployStatus:      Option[DeployStatus] ){
   def this() = this(None, None, None, None, None, None)
   def this(configuration: Configuration) = this(
         appeal            = configuration.getString("appeal")            .flatMap(Appeal(_, appeals)),
         complexity        = configuration.getString("complexity")        .flatMap(Complexity(_, complexities)),
         likelihood        = configuration.getString("likelihood")        .flatMap(Likelihood(_, likelihoods)),
         developmentStatus = configuration.getString("status.development").flatMap(DevelopmentStatus(_, developmentStatuses)),
         releaseStatus     = configuration.getString("status.release")    .flatMap(ReleaseStatus(_, releaseStatuses)),
         deployStatus      = configuration.getString("status.deploy")     .flatMap(DeployStatus(_, deployStatuses)) )
   val isEmpty = appeal.orElse(complexity)
                       .orElse(likelihood)
                       .orElse(developmentStatus)
                       .orElse(releaseStatus)
                       .orElse(deployStatus)
                       .isEmpty
  val characteristics: List[Characteristic] = appeal.toList ::: complexity.toList :::
                                                                likelihood.toList :::
                                                                developmentStatus.toList :::
                                                                releaseStatus.toList :::
                                                                deployStatus.toList
  def hasCharacteristic(characteristic: Characteristic) = characteristics.contains(characteristic)

  val isLive = deployStatus.contains(Live)
  val isMothballed = releaseStatus.contains(Mothballed)
  val isAbandoned = developmentStatus.contains(Abandoned)
  val isNotStarted = developmentStatus.contains(NotStarted) || developmentStatus.isEmpty
  val isNotReleased = releaseStatus.contains(NotReleased) || releaseStatus.isEmpty
  val isUnlikely = likelihood.contains(Unlikely) || likelihood.contains(Never)
  val isUnappealing = appeal.contains(LowAppeal) || appeal.contains(NoAppeal)
}
