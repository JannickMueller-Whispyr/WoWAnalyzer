import EventLinkNormalizer, { EventLink } from 'parser/core/EventLinkNormalizer';
import { Options } from 'parser/core/Module';
import SPELLS from 'common/SPELLS/rogue';
import TALENTS from 'common/TALENTS/rogue';
import {
  ApplyBuffEvent,
  CastEvent,
  EventType,
  GetRelatedEvents,
  RemoveBuffEvent,
} from 'parser/core/Events';

const CONSUME_ON_CAST_BUFFER_MS = 200;
const REAPPLY_BUFFER_MS = 200;
const BUFF_GAIN_FROM_CAST_MS = 11 * 1000; // 11s buffer
const SEPSIS_CAST_BUFFER = 4000;

const CONSUMED_SEPSIS_BUFF = 'ConsumedSepsisBuff';
const REAPPLY_SEPSIS_BUFF = 'ReapplySepsisBuff';
const BUFF_GAIN_FROM_CAST = 'ApplySepsisBuffFromCast';
const SEPSIS_CAST = 'SepsisCast'

const EVENT_LINKS: EventLink[] = [
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.GARROTE.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) =>
      c.hasTalent(TALENTS.SEPSIS_TALENT) && c.hasTalent(TALENTS.IMPROVED_GARROTE_TALENT),
  },
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.AMBUSH.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.SAP.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.CHEAP_SHOT.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.DISTRACT.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: CONSUMED_SEPSIS_BUFF,
    reverseLinkRelation: CONSUMED_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.PICK_POCKET.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    backwardBufferMs: CONSUME_ON_CAST_BUFFER_MS,
    anyTarget: true,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: REAPPLY_SEPSIS_BUFF,
    reverseLinkRelation: REAPPLY_SEPSIS_BUFF,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.RemoveBuff,
    referencedEventId: SPELLS.SEPSIS_BUFF.id,
    referencedEventType: EventType.ApplyBuff,
    forwardBufferMs: REAPPLY_BUFFER_MS,
    backwardBufferMs: REAPPLY_BUFFER_MS,
    maximumLinks: 1,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: BUFF_GAIN_FROM_CAST,
    reverseLinkRelation: BUFF_GAIN_FROM_CAST,
    linkingEventId: SPELLS.SEPSIS_BUFF.id,
    linkingEventType: EventType.ApplyBuff,
    referencedEventId: TALENTS.SEPSIS_TALENT.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: BUFF_GAIN_FROM_CAST_MS,
    backwardBufferMs: BUFF_GAIN_FROM_CAST_MS,
    maximumLinks: 2,
    anyTarget: true,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
  {
    linkRelation: SEPSIS_CAST,
    linkingEventId: TALENTS.SEPSIS_TALENT.id,
    linkingEventType: EventType.Cast,
    referencedEventId: TALENTS.SEPSIS_TALENT.id,
    referencedEventType: EventType.Cast,
    forwardBufferMs: 0,
    backwardBufferMs: SEPSIS_CAST_BUFFER,
    anyTarget: true,
    isActive: (c) => c.hasTalent(TALENTS.SEPSIS_TALENT),
  },
];

export default class SepsisLinkNormalizer extends EventLinkNormalizer {
  constructor(options: Options) {
    super(options, EVENT_LINKS);
  }
}

export const getCastThatConsumedSepsisBuff = (event: RemoveBuffEvent): CastEvent | undefined => {
  return GetRelatedEvents(event, CONSUMED_SEPSIS_BUFF)
    .filter((e): e is CastEvent => e.type === EventType.Cast)
    .at(0);
};

export const getSepsisBuffRemovedByCast = (event: CastEvent): RemoveBuffEvent | undefined => {
  return GetRelatedEvents(event, CONSUMED_SEPSIS_BUFF)
    .filter((e): e is RemoveBuffEvent => e.type === EventType.RemoveBuff)
    .at(0);
};

export const getSepsisBuffsGainedFromCast = (event: CastEvent): ApplyBuffEvent[] => {
  return GetRelatedEvents(event, BUFF_GAIN_FROM_CAST).filter(
    (e): e is ApplyBuffEvent => e.type === EventType.ApplyBuff,
  );
};

export const getCastFromSepsisBuffApplied = (event: ApplyBuffEvent): CastEvent | undefined => {
  return GetRelatedEvents(event, BUFF_GAIN_FROM_CAST)
    .filter((e): e is CastEvent => e.type === EventType.Cast)
    .at(0);
};

export const getSepsisBuffApplicationFromReapply = (
  event: RemoveBuffEvent,
): ApplyBuffEvent | undefined => {
  return GetRelatedEvents(event, REAPPLY_SEPSIS_BUFF)
    .filter((e): e is ApplyBuffEvent => e.type === EventType.ApplyBuff)
    .at(0);
};

export const getSepsisBuffRemovalFromReapply = (
  event: ApplyBuffEvent,
): RemoveBuffEvent | undefined => {
  return GetRelatedEvents(event, REAPPLY_SEPSIS_BUFF)
    .filter((e): e is RemoveBuffEvent => e.type === EventType.RemoveBuff)
    .at(0);
};

export function getPreviousSepsis(event: CastEvent): CastEvent | undefined {
  return GetRelatedEvents(event, SEPSIS_CAST)
    .filter((e): e is CastEvent => e.type === EventType.Cast)
    .find(Boolean);
}