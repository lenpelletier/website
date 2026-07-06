<html>
<head>
	<link href='http://fonts.googleapis.com/css?family=Open+Sans+Condensed:300italic,700,300' rel='stylesheet' type='text/css'>
	<link href='style.css' rel='stylesheet' type='text/css'>
	<title>Weak Magic Items for 5e</title>
	<!-- Global Site Tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-107685659-1"></script>
	<script>
	  window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}
	  gtag('js', new Date());

	  gtag('config', 'UA-107685659-1');
	</script>


</head>
<body>
<div id="container">
<date class="date"><span>May 19, 2022</span></date>
<h1>Weak Magic Items for 5e</h1>
<author class="author"><span>By Len</span></author>

<center><p><a href="index.php">HOME</a> | <a href="suggestions.html">SUGGEST A PROPERTY</a> | <a href="tables.php">RANDOM TABLES</a></p></center>

<br>

<!--<center><p><a href="index.php">Home</a> <strong>|</strong> <a href="one.php">Generate 1 Property Items</a> <strong>|</strong> <a href="two.php">Generate 2 Property Items</a> <strong>|</strong> <a href="tables.php">Property Tables</a></p></center>-->

<p class="frontpage">A +1 item is a kingly gift in the newest edition of Dungeons and Dragons.  And yet the allure of killing monsters and taking their stuff never grows old.  What magical weapons should we line the tombs and treasure chests that we put in the path of our players' early adventures?  I have created this generator that uses <a href="tables.php">a table of 200 properties</a> to generate millions weak and unique magical items.  These are the kind of weapons that are better than nothing, but each weaker than a +1 item.</p>

<p class="frontpage">+1 items are also guilty of being boring.  Each property in this generator lends to an evocative name, either to be used as-is or to offer inspiration for something better. And that's it.  You won't find paragraphs of fiction describing the back story of these weapons, nor dialogue from a scene depicting its origin. Just concise, evocative names to get your gears turning.</p>

<p class="frontpage">Whether you use these humble items as-is, or they serve as inspiration you, I hope you enjoy!</p>

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
