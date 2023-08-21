import MajorCooldown, {
  createChecklistItem,
  SpellCast,
} from 'parser/core/MajorCooldowns/MajorCooldown';
import { SpellUse, UsageInfo } from 'parser/core/SpellUsage/core';
import { ReactNode } from 'react';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS/rogue';
import TALENTS from 'common/TALENTS/rogue';
import Events, { ApplyBuffEvent, CastEvent, HasTarget, RemoveBuffEvent } from 'parser/core/Events';
import { Trans } from '@lingui/macro';
import SpellLink from 'interface/SpellLink';
import Enemies from 'parser/shared/modules/Enemies';
import { isDefined } from 'common/typeGuards';
import { combineQualitativePerformances } from 'common/combineQualitativePerformances';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import GarroteUptimeAndSnapshots from '../spells/GarroteUptimeAndSnapshots';
import RuptureUptimeAndSnapshots from '../spells/RuptureUptimeAndSnapshots';
import { isInOpener } from 'analysis/retail/rogue/assassination/constants';
import { formatDurationMillisMinSec } from 'common/format';
import { getCastFromSepsisBuffApplied, getCastThatConsumedSepsisBuff, getPreviousSepsis, getSepsisBuffApplicationFromReapply, getSepsisBuffRemovalFromReapply, getSepsisBuffRemovedByCast, getSepsisBuffsGainedFromCast } from '../../normalizers/SepsisLinkNormalizer';
import { ExplanationSection } from 'analysis/retail/demonhunter/shared/guide/CommonComponents';
import { Expandable } from 'interface';
import { SectionHeader } from 'interface/guide';
import { Cast } from 'analysis/retail/demonhunter/shared/guide/CastBreakdownSubSection';

interface SepsisCast extends SpellCast {
  buffOneAbility: CastEvent | undefined;
  buffOneTimeRemaining: number;

  buffTwoAbility: CastEvent | undefined;
  buffTwoTimeRemaining: number;

  shivCasts: number;
}


export default class Sepsis extends MajorCooldown<SepsisCast> {
  static dependencies = {
    ...MajorCooldown.dependencies,
    enemies: Enemies,
    garroteUptimeAndSnapshots: GarroteUptimeAndSnapshots,
    ruptureUptimeAndSnapshots: RuptureUptimeAndSnapshots,
  };

  protected enemies!: Enemies;
  protected garroteUptimeAndSnapshots!: GarroteUptimeAndSnapshots;
  protected ruptureUptimeAndSnapshots!: RuptureUptimeAndSnapshots;

  constructor(options: Options) {
    super({ spell: TALENTS.SEPSIS_TALENT }, options);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.SEPSIS_TALENT),
      this.onCast
    );
  }


  description(): ReactNode {
    return (
      <>
        <ExplanationSection>
          <p>
            <Trans id="guide.rogue.assassination.sections.cooldowns.sepsis.explanation">
              <strong>
                <SpellLink id={TALENTS.SEPSIS_TALENT} />
              </strong>{' '}
              is a strong cooldown that allows for much higher uptime on
              <SpellLink id={TALENTS.IMPROVED_GARROTE_TALENT} /> in fights.
            </Trans>
          </p>
        </ExplanationSection>
        <ExplanationSection>
          <Expandable
            header={
              <SectionHeader>
                <strong>
                  The first buff
                </strong>
              </SectionHeader>
            }
            element="section"
          >
            <div>
              The first buff from <SpellLink spell={TALENTS.SEPSIS_TALENT} /> should always be consumed
              by <SpellLink spell={TALENTS.IMPROVED_GARROTE_TALENT} /> as the very next abilty cast. This empowers
              your <SpellLink spell={SPELLS.GARROTE} /> as early as possible.
            </div>
          </Expandable>
          <Expandable
            header={
              <SectionHeader>
                <strong>
                  The second buff
                </strong>
              </SectionHeader>
            }
            element="section"
          >
            <div>
              The second buff from <SpellLink spell={TALENTS.SEPSIS_TALENT} /> should always be held onto as long as possible
              before being consumed by <SpellLink spell={TALENTS.IMPROVED_GARROTE_TALENT} />. This ensures the maximum uptime of the effect.
              If the empowered <SpellLink spell={SPELLS.GARROTE} /> from the previous <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff is in
              pandemic range with less than 5.4 seconds remaining, you may refresh at that point as well.
            </div>
          </Expandable>
        </ExplanationSection>
      </>
    )
  }

  explainPerformance(cast: SepsisCast): SpellUse {
    const buffOneChecklistItem = createChecklistItem(
      'First buff at the start of sepsis',
      cast,
      this.buffOnePerformance(cast),
    );
    const buffTwoChecklistItem = createChecklistItem(
      'Second buff after sepsis expiration',
      cast,
      this.buffTwoPerformance(cast),
    );
    const shivChecklistItem = createChecklistItem(
      'shiv',
      cast,
      this.shivPerformance(cast),
    );

    const checklistItems = [
      buffOneChecklistItem,
      buffTwoChecklistItem,
      shivChecklistItem,
    ].filter(isDefined);
    const performance = combineQualitativePerformances(
      checklistItems.map((item) => item.performance),
    );

    return {
      event: cast.event,
      checklistItems: checklistItems,
      performance: performance,
      performanceExplanation:
        performance !== QualitativePerformance.Fail ? `${performance} Usage` : `Bad Usage`,
    };
  }

  private buffOnePerformance(cast: SepsisCast): UsageInfo | undefined {
    const buffOneSummary = (
      <div>
        Consume the first <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff with <SpellLink spell={TALENTS.IMPROVED_GARROTE_TALENT} />
      </div>
    )
    if (!cast.buffOneAbility) {
      return {
        performance: QualitativePerformance.Fail,
        summary: buffOneSummary,
        details: (
          <div>
            You did not consume the first <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff.

             TimeRemain: {cast.buffOneTimeRemaining}
          </div>
        )
      }
    } else if (cast.buffOneAbility) {
      if (cast.buffOneAbility.ability.guid !== SPELLS.GARROTE.id) {
        return {
          performance: QualitativePerformance.Fail,
          summary: buffOneSummary,
          details: (
            <div>
              You did not consume the first <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff using the right ability.
              Remember that you should always be using the first buff to empower <SpellLink spell={SPELLS.GARROTE} />. 

              Ability: {cast.buffOneAbility.timestamp} TimeRemain: {cast.buffOneTimeRemaining}
            </div>
          )
        }
      }
      if (cast.buffOneAbility.ability.guid === SPELLS.GARROTE.id) {
        if (cast.buffOneTimeRemaining < 5) {
          return {
            performance: QualitativePerformance.Ok,
            summary: buffOneSummary,
            details: (
              <div>
                You cast {cast.buffOneAbility} <SpellLink spell={SPELLS.GARROTE} /> to consume the first buff,
                with {cast.buffOneTimeRemaining} seconds left. This is okay, but you should consider using the first buff earlier.

                Ability: {cast.buffOneAbility.timestamp} TimeRemain: {cast.buffOneTimeRemaining}
              </div>
            )
          }
        }
        if (cast.buffOneTimeRemaining >= 5) {
          return {
            performance: QualitativePerformance.Perfect,
            summary: buffOneSummary,
            details: (
              <div>
                You cast {cast.buffOneAbility} <SpellLink spell={SPELLS.GARROTE} /> to consume the first buff,
                with {cast.buffOneTimeRemaining} seconds left.

                Ability: {cast.buffOneAbility.timestamp} TimeRemain: {cast.buffOneTimeRemaining}
              </div>
            )
          }
        }
      }
    }
  }

  private buffTwoPerformance(cast: SepsisCast): UsageInfo | undefined {
    const buffTwoSummary = (
      <div>
        Consume the second <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff with <SpellLink spell={TALENTS.IMPROVED_GARROTE_TALENT} />
      </div>
    )
    if (cast.buffTwoAbility) {
      return {
        performance: QualitativePerformance.Perfect,
        summary: buffTwoSummary,
        details: (
          <div>
            You cast {cast.buffTwoAbility} <SpellLink spell={SPELLS.GARROTE} /> to consume the second buff,
            with {cast.buffTwoTimeRemaining} seconds left.
  
            Ability: {cast.buffTwoAbility.timestamp} TimeRemain: {cast.buffTwoTimeRemaining}
          </div>
        )
      }
    } else {
      return {
        performance: QualitativePerformance.Fail,
        summary: buffTwoSummary,
        details: (
          <div>
          You did not consume the first <SpellLink spell={TALENTS.SEPSIS_TALENT} /> buff.

           TimeRemain: {cast.buffOneTimeRemaining}
        </div>
        )
      }
    }
    
  }

  private shivPerformance(cast: SepsisCast): UsageInfo | undefined {
    const shivSummary = (
      <div>
        Cast <SpellLink spell={SPELLS.SHIV} /> during <SpellLink spell={TALENTS.SEPSIS_TALENT} />
      </div>
    )
    const sepsisCastRecently = getPreviousSepsis(cast.event);
    if (cast.shivCasts > 0) {
      if (sepsisCastRecently) {
        return {
          performance: QualitativePerformance.Perfect,
          summary: shivSummary,
          details: (
            <div>
              You cast {cast.shivCasts} <SpellLink spell={SPELLS.SHIV} />
              (s).

              Ability: {cast.shivCasts} Sepsis: {sepsisCastRecently.timestamp}
            </div>
          )
        }
      }
      else {
        return {
          performance: QualitativePerformance.Ok,
          summary: shivSummary,
          details: (
            <div>
              You cast {cast.shivCasts} <SpellLink spell={SPELLS.SHIV} />(s),
              but it was very late into <SpellLink spell={TALENTS.SEPSIS_TALENT} />, which lost uptime.

              Ability: {cast.shivCasts}
            </div>
          )
        }
      }
    }
    else {
      return {
        performance: QualitativePerformance.Fail,
        summary: shivSummary,
        details: (
          <div>
            You did not cast {cast.shivCasts} <SpellLink spell={SPELLS.SHIV} /> during <SpellLink spell={TALENTS.SEPSIS_TALENT} />.
          
            Ability: {cast.shivCasts} Sepsis: {sepsisCastRecently?.timestamp}
          </div>
        )
      }
    }
  }

  private onCast(event: CastEvent) {

    const enemy = this.enemies.getEntity(event);
    const previousSepsis = getPreviousSepsis(event);
    const sepsisRemovalEvent = getSepsisBuffRemovedByCast(event);
   
    let buffOneAbility: CastEvent | undefined;
    let buffOneTimeRemaining: number;

    let buffTwoAbility: CastEvent | undefined;
    let buffTwoTimeRemaining: number;
    
    let shivCasts: number;

    const didConsumeSepsisBuff = sepsisRemovalEvent !== undefined;
    const sepsisBuffConsumingCastEvent = sepsisRemovalEvent ? getCastThatConsumedSepsisBuff(sepsisRemovalEvent) : undefined;

    // Check how long remained on Sepsis buff/debuff (lasts 10s)
    const timeRemainingOnSepsisBuff = this.selectedCombatant.getRemainingBuffTimeAtTimestamp(SPELLS.SEPSIS_BUFF.id, 10 * 1000, 10 * 1000, event.timestamp);
    const timeRemainingOnSepsisDebuff = enemy?.getRemainingBuffTimeAtTimestamp(SPELLS.SEPSIS_DEBUFF.id, 10 * 1000, 10 * 1000, event.timestamp);

    // if the buff was consumed while the sepsis debuff has any time left, it must be the first buff
    if (timeRemainingOnSepsisDebuff === undefined) {
      buffOneAbility = undefined;
      buffOneTimeRemaining = 0;
      buffTwoAbility = undefined;
      buffTwoTimeRemaining = 0;

    } else if (timeRemainingOnSepsisDebuff >= 0){
      buffOneAbility = sepsisBuffConsumingCastEvent;
      buffOneTimeRemaining = timeRemainingOnSepsisBuff;
    } else {
      buffOneAbility = undefined;
      buffOneTimeRemaining = 0;
    }

    if (timeRemainingOnSepsisDebuff === undefined) {
      buffOneAbility = undefined;
      buffOneTimeRemaining = 0;
      buffTwoAbility = undefined;
      buffTwoTimeRemaining = 0;

    } else if (timeRemainingOnSepsisDebuff < 0){
      buffTwoAbility = sepsisBuffConsumingCastEvent;
      buffTwoTimeRemaining = timeRemainingOnSepsisBuff;
    } else {
      buffTwoAbility = undefined;
      buffTwoTimeRemaining = 0;
    }




    if (timeRemainingOnSepsisDebuff !== 0) {
      shivCasts = 1
    } else {
      shivCasts = 0
    }

    this.recordCooldown({
      event,
      buffOneAbility,
      buffOneTimeRemaining,

      buffTwoAbility,
      buffTwoTimeRemaining,

      shivCasts
    });
  }
}