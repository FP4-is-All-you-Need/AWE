import {expect,type Locator} from '@playwright/test';

// A DOM count is insufficient: visit every tile and verify its complete painted
// area fits its SVG and the viewport, with an unobstructed clickable center.
export async function visibleTiles(row:Locator,expected:number){
 const tiles=row.locator('[data-tile-id]');await expect(tiles).toHaveCount(expected);
 let visible=0;
 for(const tile of await tiles.all()){
  await tile.scrollIntoViewIfNeeded();
  const painted=await tile.evaluate(node=>{
   const r=node.getBoundingClientRect(),s=node.closest('svg')!.getBoundingClientRect();
   const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {unclipped:r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1,
    onScreen:r.left>=0&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1,
    hit:!!hit&&node.contains(hit),width:r.width,height:r.height};
  });
  expect(painted).toMatchObject({unclipped:true,onScreen:true,hit:true});
  expect(painted.width).toBeGreaterThan(100);expect(painted.height).toBeGreaterThan(100);visible++;
 }
 expect(visible).toBe(expected);
}

