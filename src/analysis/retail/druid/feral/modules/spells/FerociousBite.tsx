import SPELLS from 'common/SPELLS';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, TargettedEvent } from 'parser/core/Events';

import { getAdditionalEnergyUsed } from '../../normalizers/FerociousBiteDrainLinkNormalizer';
import { TALENTS_DRUID } from 'common/TALENTS';
import { BoxRowEntry, PerformanceBoxRow } from 'interface/guide/components/PerformanceBoxRow';
import RipUptimeAndSnapshots from 'analysis/retail/druid/feral/modules/spells/RipUptimeAndSnapshots';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellLink } from 'interface';
import {
  ACCEPTABLE_BERSERK_CPS,
  ACCEPTABLE_CPS,
  cdSpell,
  FEROCIOUS_BITE_ENERGY,
  FEROCIOUS_BITE_MAX_DRAIN,
  getAcceptableCps,
  INCARN_ENERGY_MULT,
  RELENTLESS_PREDATOR_FB_ENERGY_MULT,
} from 'analysis/retail/druid/feral/constants';
import getResourceSpent from 'parser/core/getResourceSpent';
import { explanationAndDataSubsection } from 'interface/guide/components/ExplanationRow';
import { BadColor, OkColor } from 'interface/guide';

const MIN_ACCEPTABLE_TIME_LEFT_ON_RIP_MS = 5000;

/**
 * Tracks Ferocious Bite usage for analysis, including some legendary and talent interactions.
 */
class FerociousBite extends Analyzer {
  static dependencies = {
    rip: RipUptimeAndSnapshots,
  };

  protected rip!: RipUptimeAndSnapshots;

  hasSotf: boolean;

  castEntries: BoxRowEntry[] = [];

  constructor(options: Options) {
    super(options);

    this.hasSotf = this.selectedCombatant.hasTalent(TALENTS_DRUID.SOUL_OF_THE_FOREST_FERAL_TALENT);

    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.FEROCIOUS_BITE),
      this.onFbCast,
    );
  }

  onFbCast(event: CastEvent) {
    if (event.resourceCost && event.resourceCost[RESOURCE_TYPES.ENERGY.id] === 0) {
      return; // free FBs (like from Apex Predator's Craving) don't drain but do full damage
    }

    const duringBerserkAndSotf =
      this.hasSotf &&
      (this.selectedCombatant.hasBuff(SPELLS.BERSERK.id) ||
        this.selectedCombatant.hasBuff(TALENTS_DRUID.INCARNATION_AVATAR_OF_ASHAMANE_TALENT.id));
    const extraEnergyUsed = getAdditionalEnergyUsed(event);
    const maxExtraEnergy =
      FEROCIOUS_BITE_MAX_DRAIN *
      (this.selectedCombatant.hasTalent(TALENTS_DRUID.RELENTLESS_PREDATOR_TALENT)
        ? RELENTLESS_PREDATOR_FB_ENERGY_MULT
        : 1) *
      (this.selectedCombatant.hasBuff(TALENTS_DRUID.INCARNATION_AVATAR_OF_ASHAMANE_TALENT.id)
        ? INCARN_ENERGY_MULT
        : 1);
    const usedMax = extraEnergyUsed >= maxExtraEnergy;

    if (!duringBerserkAndSotf && usedMax) {
      event.meta = event.meta || {};
      event.meta.isInefficientCast = true;
      event.meta.inefficientCastReason = `Used with low energy, causing only ${extraEnergyUsed}
        extra energy to be turned in to bonus damage. You should always cast Ferocious Bite with
        the full extra energy available in order to maximize damage`;
    }

    // fill out cast entry
    let timeLeftOnRip = 0;
    // target is optional in cast event, but we know FB cast will always have it
    if (event.targetID !== undefined && event.targetIsFriendly !== undefined) {
      timeLeftOnRip = this.rip.getTimeRemaining(event as TargettedEvent<any>);
    }
    const cpsUsed = getResourceSpent(event, RESOURCE_TYPES.COMBO_POINTS);
    const acceptableTimeLeftOnRip = timeLeftOnRip >= MIN_ACCEPTABLE_TIME_LEFT_ON_RIP_MS;

    let value: QualitativePerformance = QualitativePerformance.Good;
    let perfExplanation: React.ReactNode = undefined;
    const currAcceptableCps = getAcceptableCps(this.selectedCombatant);
    if (cpsUsed < currAcceptableCps) {
      value = QualitativePerformance.Fail;
      perfExplanation = (
        <h5 style={{ color: BadColor }}>
          Bad because you used less than {currAcceptableCps} CPs
          <br />
        </h5>
      );
    } else if (!usedMax && !duringBerserkAndSotf) {
      value = QualitativePerformance.Fail;
      perfExplanation = (
        <h5 style={{ color: BadColor }}>
          Bad because you cast at too low energy
          <br />
        </h5>
      );
    } else if (!acceptableTimeLeftOnRip) {
      value = QualitativePerformance.Ok;
      perfExplanation = (
        <h5 style={{ color: OkColor }}>
          Questionable because you cast when Rip was close to expiring
          <br />
        </h5>
      );
    }

    const tooltip = (
      <>
        {perfExplanation}@ <strong>{this.owner.formatTimestamp(event.timestamp)}</strong> targetting{' '}
        <strong>{this.owner.getTargetName(event)}</strong> using <strong>{cpsUsed} CPs</strong>
        <br />
        Extra energy used:{' '}
        <strong>
          {extraEnergyUsed} / {maxExtraEnergy}
        </strong>{' '}
        {duringBerserkAndSotf && '(during Berserk)'}
        <br />
        {timeLeftOnRip === 0 ? (
          <>
            <strong>No Rip on target!</strong>
          </>
        ) : (
          <>
            Time remaining on Rip: <strong>{(timeLeftOnRip / 1000).toFixed(1)}s</strong>
          </>
        )}
      </>
    );

    this.castEntries.push({
      value,
      tooltip,
    });
  }

  get guideSubsection(): JSX.Element {
    const hasConvokeOrApex =
      this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT) ||
      this.selectedCombatant.hasTalent(TALENTS_DRUID.APEX_PREDATORS_CRAVING_TALENT);
    const explanation = (
      <p>
        <strong>
          <SpellLink id={SPELLS.FEROCIOUS_BITE.id} />
        </strong>{' '}
        is your direct damage finisher. Use it when you've already applied Rip to enemies. Always
        use Bite with at least {ACCEPTABLE_CPS} CPs ({ACCEPTABLE_BERSERK_CPS} during{' '}
        <SpellLink spell={cdSpell(this.selectedCombatant)} />
        ). Bite can consume up to {FEROCIOUS_BITE_MAX_DRAIN} extra energy to do increased damage -
        this boost is very efficient and you should always wait until{' '}
        {FEROCIOUS_BITE_MAX_DRAIN + FEROCIOUS_BITE_ENERGY} energy to use Bite.{' '}
        {this.hasSotf && (
          <>
            One exception: because you have{' '}
            <SpellLink id={TALENTS_DRUID.SOUL_OF_THE_FOREST_FERAL_TALENT.id} />, it is acceptable to
            use low energy bites during <SpellLink spell={cdSpell(this.selectedCombatant)} /> in
            order to get extra finishers in.
          </>
        )}
      </p>
    );

    const data = (
      <div>
        {hasConvokeOrApex && (
          <>
            The below cast evaluations consider only CP spending Bites -{' '}
            <SpellLink id={TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT.id} /> and{' '}
            <SpellLink id={TALENTS_DRUID.APEX_PREDATORS_CRAVING_TALENT.id} /> procs aren't included.
            <br />
          </>
        )}
        <strong>Ferocious Bite casts</strong>
        <small>
          {' '}
          - Green is a good cast , Yellow is an questionable cast (used on target with low duration
          Rip), Red is a bad cast (&lt;25 extra energy + not during Berserk, or low CPs). Mouseover
          for more details.
        </small>
        <PerformanceBoxRow values={this.castEntries} />
      </div>
    );

    return explanationAndDataSubsection(explanation, data);
  }
}

export default FerociousBite;
