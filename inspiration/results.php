<?php
$delimiter = ';';
if ($_POST["item"] == "weapons") {
	$properties = file("weaponproperties.txt");
	$items = file("weapons.txt");
}
else if ($_POST["item"] == "armor"){
	$properties = file("armorproperties.txt");
	$items = file("armor.txt");
}
else if ($_POST["item"] == "trinkets"){
	$properties = file("trinketproperties.txt");
	$items = file("trinkets.txt");
}
?>

<html>
	<head>
		<link href='http://fonts.googleapis.com/css?family=Open+Sans+Condensed:300italic,700,300' rel='stylesheet' type='text/css'>
		<link href='style.css' rel='stylesheet' type='text/css'>
		<title>Weak Magic Items for 5e</title>
	</head>
	<body>
		<div id="container">
			<div id="topBorder"></div>
			<div id="content">

				<date class="date"><span>December.12.2016</span></date>
				<h1>Weak Magic Items for 5e</h1>
				<author class="author"><span>By Len Pelletier</span></author>

				<center><p class="nav"><a href="index.php">Home</a> | <a href="suggestions.html">Suggest a Property</a> | <a href="tables.php">Random Tables</a></p></center>

				<div class="choices">
					<form action="results.php" method="post">
					<ul>

					<li>
					<label>Type of Items</label>
					<select name="item">
						<option <?php if($_POST["item"] == "weapons"){echo("selected");}?> value="weapons">Weapons</option>
						<option <?php if($_POST["item"] == "armor"){echo("selected");}?> value="armor">Armor</option>
						<option <?php if($_POST["item"] == "trinkets"){echo("selected");}?> value="trinkets">Trinkets</option>
					</select>
					</li>

					<li>
					<label>First Property</label>
					<select name="prop1">
						<option <?php if($_POST["prop1"] == "none"){echo("selected");}?> value="none">None</option>
						<option <?php if($_POST["prop1"] == "weak"){echo("selected");}?> value="weak">Weak</option>
					</select>
					</li>

					<li>
					<label>Second Property</label>
					<select name="prop2">
						<option <?php if($_POST["prop2"] == "none"){echo("selected");}?> value="none">None</option>
						<option <?php if($_POST["prop2"] == "weak"){echo("selected");}?> value="weak">Weak</option>
					</select>
					</li>

					<li>
					<label>Quantity (1 - 1000)</label>
					<input type="number" name="quantity" min="1" max="1000" value="<?php {echo("{$_POST["quantity"]}");}?>">
					</li>

					<li>
					<input type="submit">
					</li>

					</ul>
					</form>
				</div>

				<?
					$i = 0;
					while ($i < $_POST["quantity"]) {
						srand((double)microtime() * 1000000);
						$rand1 = rand(0, count($properties)-1);
						$rand2 = rand(0, count($properties)-1);
						$rand3 = rand(0, count($items)-1);

						while ($rand1 == $rand2) {
							$rand1 = rand(0, count($properties)-1);
							$rand2 = rand(0, count($properties)-1);
						}

						$firstProperty   = explode ($delimiter, $properties[$rand1]);
						$secondProperty = explode ($delimiter, $properties[$rand2]);
						$item            = explode ($delimiter, $items[$rand3]);



						$orignalProperties = "";
						if ($_POST["item"] == "weapons") {
							$orignalProperties = "Weapon ({$item[0]})";
							$rand4  = rand(6, count($item)-1);
						}
						else if ($_POST["item"] == "armor") {
							$orignalProperties = "Armor ({$item[0]})";
							$rand4 = 0;
						}
						else if ($_POST["item"] == "trinkets") {
							$orignalProperties = "Wonderous item, uncommon (requires attunement)";
							$rand4 = 0;
						}

						echo "\n";
						echo "\n";

						$i++;

						echo "<div class=weapon>";
						if ($_POST["prop1"] == "weak" && $_POST["prop2"] == "weak") {
							echo "<h2>{$i}: {$firstProperty[0]} {$item[$rand4]} {$secondProperty[1]}</h2>";
							echo "\n<p class=ital><i>{$orignalProperties}, uncommon (requires attunement)</i></p>";
							echo "<p>{$firstProperty[2]}</p>";
							echo "<p>{$secondProperty[2]}</p>";
						} else if ($_POST["prop1"] == "weak" && $_POST["prop2"] == "none") {
							echo "<h2>{$i}: {$firstProperty[0]} {$item[$rand4]}</h2>";
							echo "\n<p class=ital><i>{$orignalProperties}, uncommon (requires attunement)</i></p>";
							echo "\n<p>{$firstProperty[2]}</p>";
						} else if ($_POST["prop1"] == "none" && $_POST["prop2"] == "weak") {
							echo "<h2>{$item[$rand4]} {$secondProperty[1]}</h2>";
							echo "\n<p class=ital><i>{$orignalProperties}, uncommon (requires attunement)</i></p>";
							echo "\n<p>{$secondProperty[2]}</p>";
						} else if ($_POST["prop1"] == "none" && $_POST["prop2"] == "none") {
							echo "<h2>{$i}: {$item[$rand4]}</h2>";
							echo "\n<p class=ital><i>{$orignalProperties}</i></p>";
						}
						echo "</div>";
					}
					?>
				</div>
			<div id="bottomBorder"></div>
			<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({
    google_ad_client: "ca-pub-2975046401105251",
    enable_page_level_ads: true
  });
</script>
		</div>
	</body>
</html>
