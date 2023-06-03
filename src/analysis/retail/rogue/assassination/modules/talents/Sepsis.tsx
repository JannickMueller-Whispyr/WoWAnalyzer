import MajorCooldown, {
  createChecklistItem,
  SpellCast,
} from 'parser/core/MajorCooldowns/MajorCooldown';
import { SpellUse, UsageInfo } from 'parser/core/SpellUsage/core';
import { ReactNode } from 'react';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import SPELLS from 'common/SPELLS/rogue';
import TALENTS from 'common/TALENTS/rogue';
import Events, { CastEvent, HasTarget, RemoveBuffEvent } from 'parser/core/Events';
import { Trans } from '@lingui/macro';
import SpellLink from 'interface/SpellLink';
import Enemies from 'parser/shared/modules/Enemies';
import { isDefined } from 'common/typeGuards';
import { combineQualitativePerformances } from 'common/combineQualitativePerformances';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { getCastThatConsumedSepsisBuff, getSepsisBuffRemovedByCast } from 'analysis/retail/rogue/assassination/normalizers/SepsisLinkNormalizer';
import GarroteUptimeAndSnapshots from '../spells/GarroteUptimeAndSnapshots';
import RuptureUptimeAndSnapshots from '../spells/RuptureUptimeAndSnapshots';
import { isInOpener } from 'analysis/retail/rogue/assassination/constants';
import { formatDurationMillisMinSec } from 'common/format';

const OK_DURATION_ON_RUPTURE = 32000;
const FAIL_DURATION_ON_RUPTURE = 10666;

interface SepsisCast extends SpellCast {
  targetHadDeathmarkActiveOnCast: boolean;
  targetHadRuptureOnCast: boolean;
  targetHadGarroteOnCast: boolean;
  targetTimeLeftOnGarrote: number;
  targetTimeLeftOnRupture: number;
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
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.GARROTE),
      this.onCast
    );
  }
  
  
  description(): ReactNode {
      return (
        <Trans id="guide.rogue.assassination.sections.cooldowns.sepsis.explanation">
          <strong>
            <SpellLink id={TALENTS.SEPSIS_TALENT} />
          </strong>{' '}
          is a strong cooldown that allows for much higher uptime on 
          <SpellLink id={TALENTS.IMPROVED_GARROTE_TALENT} /> in fights.
        </Trans>
      )
  }
  
  explainPerformance(cast: SepsisCast): SpellUse {
    const firstSepsisGarroteChecklistItem = createChecklistItem(
      'First garrote',
      cast,
      this.firstSepsisGarrotePerformance(cast),
    );
    const secondSepsisGarroteChecklistItem = createChecklistItem(
      'Second garrote',
      cast,
      this.secondSepsisGarrotePerformance(cast),
    );

    const checklistItems = [
      firstSepsisGarroteChecklistItem,
      secondSepsisGarroteChecklistItem,
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

  private firstSepsisGarrotePerformance(cast: SepsisCast): UsageInfo | undefined {
    if (!this) {
      return undefined
    }


  }

  private secondSepsisGarrotePerformance(cast: SepsisCast): UsageInfo | undefined {
    if (!this) {
      return undefined
    }

    
  }
  
  private onCast(event: CastEvent) {
    const enemy = this.enemies.getEntity(event);
    const sepsisRemovalEvent = getSepsisBuffRemovedByCast(event);
    const didConsumeSepsis = sepsisRemovalEvent !== undefined;
    if (!didConsumeSepsis) {
      return;
    }
  
    // Check how long remained on Sepsis buff when casting Garrote (buff lasts 10s)
    const timeRemainingOnSepsisBuff = this.selectedCombatant.getRemainingBuffTimeAtTimestamp(SPELLS.SEPSIS_BUFF.id, 10 * 1000, 10 * 1000, event.timestamp);
    const targetHadGarroteOnCast = enemy?.hasBuff(SPELLS.GARROTE.id, event.timestamp) ?? false;
    const targetHadRuptureOnCast = enemy?.hasBuff(SPELLS.RUPTURE.id, event.timestamp) ?? false;
    const targetTimeLeftOnGarrote = HasTarget(event)
      ? this.garroteUptimeAndSnapshots.getTimeRemaining(event)
      : 0;
    const targetTimeLeftOnRupture = HasTarget(event)
      ? this.ruptureUptimeAndSnapshots.getTimeRemaining(event)
      : 0;
  }





  private onBuffRemoval(event: RemoveBuffEvent) {
    const consumingCast = getCastThatConsumedSepsisBuff(event)
    const isConsumingCastGarrote = consumingCast?.ability?.guid === SPELLS.GARROTE.id;
  }
}