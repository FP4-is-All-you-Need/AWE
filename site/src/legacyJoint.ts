/** Resolve only aliases supplied by the preserved catalog; keep every other display parameter. */
export function legacyJointQuery(query:URLSearchParams,aliases:Record<string,string>):URLSearchParams|null{
 const old=query.get('joint_id');if(!old)return null;
 const id=aliases[old]??aliases[old.replace(/^joint_/,'')];if(!id)return null;
 const next=new URLSearchParams(query);next.delete('joint_id');next.delete('open.hole-comparison');
 next.set('prime_set','fp4');next.set('forms_id',id);next.set('section','modular-forms');next.set('open.modular-forms','1');next.set('open.integer-constructions','1');return next;
}
