import asyncio
from playwright.async_api import async_playwright, expect

async def run_test():
    async with async_playwright() as pw:
        # Launch browser
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            print("Navigating to Dashboard...")
            await page.goto("http://localhost:3000", wait_until="commit")
            
            # Click "Rendimento Metálico" button to open simulator
            print("Opening Metallic Yield Simulator...")
            await page.click("text=Rendimento Metálico")
            
            # Wait for simulator to load
            await expect(page.locator("text=Simulador de Rendimento da Bitola")).to_be_visible(timeout=10000)

            # Set Inputs
            print("Setting Inputs...")
            
            # 1. Select Shear Mode (Navalha)
            # It might be default, but confirm click.
            await page.click("text=Navalha")

            # 2. Set Shear Channels (Quantidade de Cortes) to 17
            # Finds the input associated with the label "Quantidade de Cortes"
            # The structure is: div > label (text) + input
            shear_input = page.locator('div:has(label:has-text("Quantidade de Cortes")) input')
            await shear_input.fill("17")

            # Wait for calculation to update (React state update is fast but good to wait a bit or for specific value)
            # The "Perda Acabamento" row should update immediately.

            # Verify Output
            print("Verifying Results...")
            
            # Find the row corresponding to "Perda Acabamento"
            loss_row = page.locator('tr:has-text("Perda Acabamento")')
            
            # The meters column is the 4th column (index 3)
            # Structure: 
            # col 1: Label ("Perda Acabamento")
            # col 2: %
            # col 3: kg
            # col 4: m
            meters_cell = loss_row.locator('td').nth(3)
            
            # Get text content
            meters_text = await meters_cell.text_content()
            print(f"Finishing Loss (Meters): {meters_text}")

            # Verify it equals "4.250"
            # 17 cuts * 0.250m/cut = 4.250m
            if "4.250" in meters_text:
                print("✅ Test PASSED: Shear Loss for 17 cuts is correctly calculated as 4.250m")
            else:
                print(f"❌ Test FAILED: Expected '4.250' but got '{meters_text}'")
                raise AssertionError(f"Expected 4.250m shear loss, got {meters_text}")

        except Exception as e:
            print(f"❌ Test Failed with Exception: {e}")
            await page.screenshot(path="test_failure.png")
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
