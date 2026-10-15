import {test,expect} from '@playwright/test';
const id='awe1_1656e4b7feacd47cbaa916a1ab39ffcdaf195a7de5d6093418e13e4d0c5e4136';
for(const lang of ['en','ja'])test(`plane sets exhaust the saved range and track an alternative encoding ${lang}`,async({page})=>{
 test.setTimeout(120000);await page.goto(`/?crt=0&b=6&width_results=1&integer_id=${id}&lang=${lang}`);
 const detail=page.locator('.integer-detail .construction-detail');await expect(detail).toBeVisible({timeout:30000});
 await expect(page.locator('[data-original-indices],[data-tile-index-map]')).toHaveCount(0);
 await detail.locator(`details[data-section="flow.${id}"] > summary`).click();
 const sets=detail.locator('[data-plane-sets=A]');await expect(sets).toHaveAttribute('data-plane-sets-complete','true');
 await expect(sets.locator('[data-plane-set]')).toHaveCount(5);
 await expect(sets.locator('[data-plane-set="0"]')).toHaveAttribute('data-values','-6,-4,-3,-2,-1,0,1,2,3,4,6,8');
 await detail.locator('[data-plane-flow=A]').screenshot({path:`../build/screens/sets-butterfly-five-${lang}.png`});
 await sets.locator('[name=plane_input]').fill('-76');
 await sets.locator('[name=plane_choice]').selectOption('4,0,-4');
 await expect(sets.locator('[data-plane-set="0"]')).toHaveAttribute('data-values','-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8');
 await expect(sets.locator('[data-current-plane-values]')).toContainText('−8');
 await sets.locator('[name=plane_set_focus][value="0"]').click();await expect(detail.locator('[name=product_index]')).toHaveValue('0');
 await page.reload();await expect(detail).toBeVisible({timeout:30000});await expect(sets.locator('[name=plane_choice]')).toHaveValue('4,0,-4');await expect(sets.locator('[data-plane-set="0"]')).toHaveAttribute('data-values','-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8');
 await sets.screenshot({path:`../build/screens/sets-five-${lang}.png`});
});
test('saved paper LUT exposes symmetric sets and the actual three-times plane',async({page})=>{
 await page.goto('/?joint_id=56b3b3d2d32f3235b48b&open.hole-comparison=1&hole_pct_max=100');
 const detail=page.locator('.joint-comparison .construction-detail');await expect(detail).toBeVisible({timeout:30000});await detail.locator('details[data-section^="flow."] > summary').click();
 const sets=detail.locator('[data-plane-sets=A]');await expect(sets).toHaveAttribute('data-plane-sets-complete','true');
 await expect(sets.locator('[data-plane-set="2"]')).toHaveAttribute('data-values','-12,-6,-3,0,3,6,12');
 await sets.locator('[name=plane_input]').fill('12');await expect(sets.locator('[data-reference=true]')).toHaveCount(1);
 await expect(sets.locator('[data-reference=true]')).toHaveAttribute('aria-pressed','true');
 await sets.screenshot({path:'../build/screens/sets-six-en.png'});
 await detail.locator('[data-plane-flow=A]').screenshot({path:'../build/screens/sets-butterfly-six-en.png'});
});
